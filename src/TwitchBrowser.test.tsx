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
  getStreams: vi.fn(async () => ({ data: [], pagination: {} })),
  getTopGames: vi.fn(async () => ({ data: [], pagination: {} })),
  searchCategories: vi.fn(async () => ({ data: [], pagination: {} })),
  searchChannels: vi.fn(),
}));

// skip the 1s debounce
vi.mock("./useDebounce", () => ({ useDebounce: (value) => value }));

function searchStreams(query: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
}

const searchedStreams = () =>
  vi.mocked(getStreams).mock.calls.filter(([params]) => params?.userLogin);

beforeEach(() => {
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
  expect(await screen.findByText("No live channels found.")).toBeVisible();
  // the first page plus 3 pages of lookahead
  expect(searchChannels).toHaveBeenCalledTimes(4);

  // the scroll sentinel would stay on screen since nothing rendered above it
  for (let i = 0; i < 3; i++) {
    await act(async () => mockAllIsIntersecting(true));
  }

  expect(searchChannels).toHaveBeenCalledTimes(4);
  expect(searchedStreams()).toEqual([]);
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
