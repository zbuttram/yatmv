import { ReactElement, ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import useFollowedStreams from "./useFollowedStreams";
import { getFollowedStreams } from "./twitch";

vi.mock("./twitch", () => ({
  checkTwitchAuth: () => true,
  getAuthedUser: async () => ({ id: "1" }),
  getFollowedStreams: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  toast: { custom: vi.fn(), dismiss: vi.fn() },
}));

const live = (userLogin: string, userName: string) => ({ userLogin, userName });

async function renderFollowed(...responses: object[][]) {
  responses.forEach((r) =>
    vi.mocked(getFollowedStreams).mockResolvedValueOnce(r as any)
  );
  const queryClient = new QueryClient();
  const addNewStream = vi.fn();
  const { result } = renderHook(() => useFollowedStreams({ addNewStream }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  await waitFor(() => expect(result.current).toEqual(responses[0]));

  let fetched = 0;
  async function refetch() {
    fetched += 1;
    await act(() =>
      queryClient.refetchQueries({ queryKey: ["followedStreams"] })
    );
    await waitFor(() => expect(result.current).toEqual(responses[fetched]));
  }
  return { addNewStream, refetch };
}

beforeEach(() => {
  vi.mocked(getFollowedStreams).mockReset();
  vi.mocked(toast.custom).mockClear();
});

test("streams already live on load don't toast", async () => {
  await renderFollowed([live("foo", "Foo")]);
  expect(toast.custom).not.toHaveBeenCalled();
});

test("toasts the first stream to go live when nothing was live on load", async () => {
  const { refetch } = await renderFollowed([], [live("foo", "Foo")]);
  await refetch();
  expect(toast.custom).toHaveBeenCalledTimes(1);
});

test("live toast shows the display name and adds by login", async () => {
  const { addNewStream, refetch } = await renderFollowed(
    [live("bar", "Bar")],
    [live("bar", "Bar"), live("woowakgood", "우왁굳")]
  );
  await refetch();

  expect(toast.custom).toHaveBeenCalledTimes(1);
  const renderToast = vi.mocked(toast.custom).mock.calls[0][0] as (
    t: object
  ) => ReactElement<{ channel: string; addStream: () => void }>;
  const element = renderToast({ id: "t", visible: true });
  expect(element.props.channel).toBe("우왁굳");
  element.props.addStream();
  expect(addNewStream).toHaveBeenCalledWith("woowakgood");
});
