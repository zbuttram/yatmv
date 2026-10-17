import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { toast } from "react-hot-toast";

import AddStream from "./AddStream";
import { checkTwitchAuth, searchChannels } from "./twitch";

vi.mock("./twitch", () => ({
  checkTwitchAuth: vi.fn(),
  getStream: vi.fn(),
  searchChannels: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn() } }));

// skip the 1s debounce
vi.mock("./useDebounce", () => ({ useDebounce: (value) => value }));

beforeEach(() => {
  vi.mocked(toast.error).mockClear();
  vi.mocked(checkTwitchAuth).mockReset().mockReturnValue(true);
  vi.mocked(searchChannels)
    .mockReset()
    .mockResolvedValue({
      data: [{ displayName: "Foo", broadcasterLogin: "foo_login" }],
      pagination: {},
    } as any);
});

afterEach(() => onlineManager.setOnline(true));

function renderAddStream(typed = "Foo") {
  const addNewStream = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AddStream addNewStream={addNewStream} setModalOpen={() => {}} />
    </QueryClientProvider>
  );
  const input = screen.getByPlaceholderText("Channel");
  fireEvent.change(input, { target: { value: typed } });
  return { addNewStream, input, queryClient };
}

test("Enter with an exact match but no highlighted result adds the login", async () => {
  const { addNewStream, input } = renderAddStream();
  await screen.findByText("Foo", { selector: "div" });

  // the exact match is auto-highlighted; ArrowUp moves the highlight off it
  fireEvent.keyUp(input, { key: "ArrowUp" });
  fireEvent.submit(input.closest("form")!);

  expect(addNewStream).toHaveBeenCalledWith("foo_login");
});

test("Enter on the highlighted result adds the login", async () => {
  const { addNewStream, input } = renderAddStream();
  await screen.findByText("Foo", { selector: "div" });

  fireEvent.submit(input.closest("form")!);

  expect(addNewStream).toHaveBeenCalledWith("foo_login");
});

test("clicking a search result adds the login", async () => {
  const { addNewStream } = renderAddStream();

  fireEvent.click(await screen.findByText("Foo", { selector: "div" }));

  expect(addNewStream).toHaveBeenCalledWith("foo_login");
});

test("Enter with a valid login that isn't in the results adds it", () => {
  const { addNewStream, input } = renderAddStream(" some_login ");
  fireEvent.submit(input.closest("form")!);
  expect(addNewStream).toHaveBeenCalledWith("some_login");
});

test("Enter with something that can't be a login shows an error", async () => {
  // e.g. a localized display name with no matching search result
  const { addNewStream, input } = renderAddStream("우왁굳");
  await screen.findByText("Foo", { selector: "div" });
  fireEvent.submit(input.closest("form")!);
  expect(addNewStream).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith(
    expect.stringContaining("isn't a Twitch channel name")
  );
});

test("Enter on a non-login while the search is running says to wait", () => {
  const { addNewStream, input } = renderAddStream("우왁굳");
  fireEvent.submit(input.closest("form")!);
  expect(addNewStream).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith(
    expect.stringContaining("Still searching")
  );
});

test("Enter on a non-login after the search failed says so", async () => {
  vi.mocked(searchChannels).mockRejectedValueOnce(new Error("down"));
  const { addNewStream, input, queryClient } = renderAddStream("우왁굳");
  await waitFor(() =>
    expect(
      queryClient.getQueryState(["searchChannels", "우왁굳"])
    ).toMatchObject({ status: "error", fetchStatus: "idle" })
  );

  fireEvent.submit(input.closest("form")!);

  expect(toast.error).toHaveBeenCalledWith(
    expect.stringContaining("Couldn't search Twitch")
  );
  expect(addNewStream).not.toHaveBeenCalled();
});

test("Enter on a non-login while logged out says to paste the URL", () => {
  vi.mocked(checkTwitchAuth).mockReturnValue(false);
  const { addNewStream, input } = renderAddStream("우왁굳");

  fireEvent.submit(input.closest("form")!);

  expect(addNewStream).not.toHaveBeenCalled();
  const message = vi.mocked(toast.error).mock.calls[0][0] as string;
  expect(message).toContain("Paste the channel URL instead");
  expect(message).not.toContain("search results");
  expect(searchChannels).not.toHaveBeenCalled();
});

test("Enter on a non-login while offline doesn't claim there's no match", () => {
  onlineManager.setOnline(false);
  const { addNewStream, input } = renderAddStream("우왁굳");

  fireEvent.submit(input.closest("form")!);

  expect(addNewStream).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith(
    expect.stringContaining("are you offline?")
  );
});

test("a pasted channel URL with surrounding spaces is added", () => {
  const { addNewStream } = renderAddStream(
    "  https://www.twitch.tv/foo_login "
  );
  expect(addNewStream).toHaveBeenCalledWith("foo_login");
});
