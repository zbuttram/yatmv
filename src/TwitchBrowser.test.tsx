import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mockAllIsIntersecting } from "react-intersection-observer/test-utils";

import TwitchBrowser from "./TwitchBrowser";
import { getStreams, searchChannels } from "./twitch";

vi.mock("./twitch", () => ({
  // one live stream per requested login
  getStreams: vi.fn(async ({ userLogin = [] }) => ({
    data: userLogin.map((login) => ({
      userLogin: login,
      userName: login,
      title: `${login} stream`,
      viewerCount: 1,
      thumbnailUrl: "https://example.com/{width}x{height}.jpg",
    })),
    pagination: {},
  })),
  getTopGames: vi.fn(async () => ({ data: [], pagination: {} })),
  searchCategories: vi.fn(async () => ({ data: [], pagination: {} })),
  searchChannels: vi.fn(),
}));

// skip the 1s debounce
vi.mock("./useDebounce", () => ({ useDebounce: (value) => value }));

const queryClients: QueryClient[] = [];

function searchStreams(query: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(queryClient);
  render(
    <QueryClientProvider client={queryClient}>
      <TwitchBrowser
        isOpen
        close={() => {}}
        followedStreams={[]}
        addNewStream={() => {}}
      />
    </QueryClientProvider>
  );
  fireEvent.click(screen.getByText("Streams"));
  fireEvent.change(screen.getByPlaceholderText("Search"), {
    target: { value: query },
  });
  return queryClient;
}

const searchedStreams = () =>
  vi.mocked(getStreams).mock.calls.filter(([params]) => params?.userLogin);

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(getStreams).mockClear();
  vi.mocked(searchChannels).mockReset();
});

test("a search with no matching channels doesn't fetch streams or keep paging", async () => {
  // Twitch can return a cursor even with no data
  vi.mocked(searchChannels).mockResolvedValue({
    data: [],
    pagination: { cursor: "next" },
  } as any);
  searchStreams("zzqqxx");
  expect(
    await screen.findByText(/No matches in the next few pages/)
  ).toBeVisible();
  // the first page plus 3 pages of lookahead
  expect(searchChannels).toHaveBeenCalledTimes(4);

  // the page is marked stalled, so there's no scroll sentinel to keep paging
  for (let i = 0; i < 3; i++) {
    await act(async () => mockAllIsIntersecting(true));
  }
  expect(searchChannels).toHaveBeenCalledTimes(4);
  expect(searchedStreams()).toEqual([]);

  // but the user can ask for more
  fireEvent.click(screen.getByText("Load more"));
  await waitFor(() => expect(searchChannels).toHaveBeenCalledTimes(8));
  expect(vi.mocked(searchChannels).mock.calls[4][1]).toMatchObject({
    after: "next",
  });
});

test("a search with no matches and no cursor says nothing was found", async () => {
  vi.mocked(searchChannels).mockResolvedValue({
    data: [],
    pagination: {},
  } as any);
  searchStreams("zzqqxx");
  expect(await screen.findByText("No live channels found.")).toBeVisible();
  expect(searchChannels).toHaveBeenCalledTimes(1);
});

test("a search looks past empty pages that still have a cursor", async () => {
  vi.mocked(searchChannels)
    .mockResolvedValueOnce({ data: [], pagination: { cursor: "p2" } } as any)
    .mockResolvedValueOnce({
      data: [{ broadcasterLogin: "a" }],
      pagination: {},
    } as any);
  searchStreams("a");

  await waitFor(() => expect(searchedStreams()).toHaveLength(1));
  expect(vi.mocked(searchChannels).mock.calls[1][1]).toEqual({ after: "p2" });
});

test("a failed search says so and can be retried", async () => {
  vi.mocked(searchChannels)
    .mockRejectedValueOnce(new Error("Twitch API response not OK"))
    .mockResolvedValue({ data: [], pagination: {} } as any);
  searchStreams("a");

  fireEvent.click(await screen.findByText("Retry"));

  expect(await screen.findByText("No live channels found.")).toBeVisible();
});

test("a search asks /streams for one result per matching channel", async () => {
  vi.mocked(searchChannels).mockResolvedValue({
    data: [{ broadcasterLogin: "a" }, { broadcasterLogin: "b" }],
    pagination: {},
  } as any);
  searchStreams("ab");

  await waitFor(() => expect(searchedStreams()).toHaveLength(1));
  expect(searchedStreams()[0][0]).toMatchObject({
    userLogin: ["a", "b"],
    first: 2,
  });
});

test("a failed next page can be retried, then the list ends", async () => {
  vi.mocked(searchChannels)
    .mockResolvedValueOnce({
      data: [{ broadcasterLogin: "a" }],
      pagination: { cursor: "p2" },
    } as any)
    .mockRejectedValueOnce(new Error("Twitch API response not OK: (500)"))
    .mockResolvedValueOnce({
      data: [{ broadcasterLogin: "b" }],
      pagination: {},
    } as any);
  searchStreams("ab");
  await waitFor(() => expect(searchedStreams()).toHaveLength(1));

  await act(async () => mockAllIsIntersecting(true));
  fireEvent.click(await screen.findByText("Retry"));

  expect(await screen.findByText("End of results.")).toBeVisible();
  expect(vi.mocked(searchChannels).mock.calls.at(-1)![1]).toMatchObject({
    after: "p2",
  });
  expect(searchedStreams().at(-1)![0]).toMatchObject({ userLogin: ["b"] });
});

test("a failed background refetch keeps the list and paging", async () => {
  vi.mocked(searchChannels)
    .mockResolvedValueOnce({
      data: [{ broadcasterLogin: "a" }],
      pagination: { cursor: "p2" },
    } as any)
    .mockRejectedValueOnce(new Error("Twitch API response not OK: (503)"));
  const queryClient = searchStreams("a");
  await waitFor(() => expect(searchedStreams()).toHaveLength(1));

  await act(() =>
    queryClient.refetchQueries({ queryKey: ["searchStreams", "a"] })
  );

  // the list stays, with a note that it's stale rather than an error
  expect(await screen.findByText(/Couldn't refresh/)).toBeVisible();
  expect(screen.getByText("a stream")).toBeVisible();
  expect(screen.queryByText(/Couldn't load/)).toBeNull();
  // the sentinel is still there, so scrolling loads the next page
  vi.mocked(searchChannels).mockResolvedValueOnce({
    data: [{ broadcasterLogin: "b" }],
    pagination: {},
  } as any);
  await act(async () => mockAllIsIntersecting(true));
  expect(await screen.findByText("End of results.")).toBeVisible();
});

test("the Categories tab says when there are no categories", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TwitchBrowser
        isOpen
        close={() => {}}
        followedStreams={[]}
        addNewStream={() => {}}
      />
    </QueryClientProvider>
  );
  fireEvent.click(screen.getByText("Categories"));
  expect(await screen.findByText("No categories found.")).toBeVisible();
});

test("a failed next page waits for Retry instead of retrying on scroll", async () => {
  vi.mocked(searchChannels)
    .mockResolvedValueOnce({
      data: [{ broadcasterLogin: "a" }],
      pagination: { cursor: "p2" },
    } as any)
    .mockRejectedValue(new Error("Twitch API response not OK: (500)"));
  searchStreams("a");
  await waitFor(() => expect(searchedStreams()).toHaveLength(1));
  await act(async () => mockAllIsIntersecting(true));
  await screen.findByText("Retry");
  const calls = vi.mocked(searchChannels).mock.calls.length;

  await act(async () => mockAllIsIntersecting(false));
  await act(async () => mockAllIsIntersecting(true));
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

  expect(searchChannels).toHaveBeenCalledTimes(calls);
});

test("scrolling during a background refetch doesn't cancel it", async () => {
  vi.mocked(searchChannels).mockResolvedValueOnce({
    data: [{ broadcasterLogin: "a" }],
    pagination: { cursor: "p2" },
  } as any);
  const queryClient = searchStreams("a");
  await waitFor(() => expect(searchedStreams()).toHaveLength(1));

  let finishRefetch!: (value: unknown) => void;
  vi.mocked(searchChannels).mockReturnValueOnce(
    new Promise((resolve) => (finishRefetch = resolve)) as any
  );
  // start the refetch and let the list render it as in flight
  await act(async () => {
    queryClient.refetchQueries({ queryKey: ["searchStreams", "a"] });
    await new Promise((resolve) => setTimeout(resolve));
  });
  await act(async () => mockAllIsIntersecting(true));

  // no next-page fetch while the refetch is in flight
  expect(
    vi.mocked(searchChannels).mock.calls.filter(([, p]) => p?.after === "p2")
  ).toEqual([]);
  await act(async () =>
    finishRefetch({
      data: [{ broadcasterLogin: "a" }],
      pagination: { cursor: "p2" },
    })
  );
});

test("after Load more finds results, scrolling pages again", async () => {
  vi.mocked(searchChannels)
    .mockResolvedValueOnce({ data: [], pagination: { cursor: "c1" } } as any)
    .mockResolvedValueOnce({ data: [], pagination: { cursor: "c2" } } as any)
    .mockResolvedValueOnce({ data: [], pagination: { cursor: "c3" } } as any)
    .mockResolvedValueOnce({ data: [], pagination: { cursor: "c4" } } as any)
    .mockResolvedValueOnce({
      data: [{ broadcasterLogin: "a" }],
      pagination: { cursor: "d" },
    } as any)
    .mockResolvedValueOnce({
      data: [{ broadcasterLogin: "b" }],
      pagination: {},
    } as any);
  searchStreams("ab");
  fireEvent.click(await screen.findByText("Load more"));
  await screen.findByText("a stream");

  await act(async () => mockAllIsIntersecting(true));

  expect(await screen.findByText("End of results.")).toBeVisible();
  expect(screen.getByText("b stream")).toBeVisible();
});

afterEach(() => {
  vi.restoreAllMocks();
  // stop refetchInterval timers
  queryClients.splice(0).forEach((client) => client.clear());
});
