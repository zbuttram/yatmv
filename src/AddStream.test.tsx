import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AddStream from "./AddStream";

vi.mock("./twitch", () => ({
  checkTwitchAuth: () => true,
  getStream: vi.fn(),
  searchChannels: vi.fn(async () => ({
    data: [{ displayName: "Foo", broadcasterLogin: "foo_login" }],
    pagination: {},
  })),
}));

// skip the 1s debounce
vi.mock("./useDebounce", () => ({ useDebounce: (value) => value }));

function renderAddStream() {
  const addNewStream = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AddStream addNewStream={addNewStream} setModalOpen={() => {}} />
    </QueryClientProvider>
  );
  const input = screen.getByPlaceholderText("Channel");
  fireEvent.change(input, { target: { value: "Foo" } });
  return { addNewStream, input };
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
