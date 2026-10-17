import { act } from "@testing-library/react";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";

import { renderStreams } from "./renderStreams";
import { handleTwitchAuthCallback } from "./twitch";
import {
  STREAM_STATE_COOKIE,
  TWITCH_ACCESS_TOKEN_COOKIE,
  TWITCH_SCOPE_COOKIE,
} from "./const";

vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn() } }));

// kept in its own file: handleTwitchAuthCallback stores the token in
// module-level state in twitch.ts, which would leak into other tests
afterEach(() => {
  Cookies.remove(STREAM_STATE_COOKIE);
  Cookies.remove(TWITCH_ACCESS_TOKEN_COOKIE);
  Cookies.remove(TWITCH_SCOPE_COOKIE);
  document.location.hash = "";
  vi.restoreAllMocks();
  vi.mocked(toast.error).mockClear();
});

test("stream state survives the Twitch auth redirect", async () => {
  const { result } = renderStreams("?streams=a,b,c&primary=a,b&layout=2");
  // the cookie is written in a setTimeout after the state effect runs
  await act(() => new Promise((resolve) => setTimeout(resolve)));
  expect(result.current.state.layout).toBe(2);

  document.location.hash = "#access_token=token";
  expect(handleTwitchAuthCallback()).toMatchObject({
    reloadFromAuthStreams: ["a", "b", "c"],
    reloadFromAuthPrimary: ["a", "b"],
    reloadFromAuthLayout: 2,
  });
});

test.each([
  ["malformed JSON", "{not json"],
  [
    "a non-string stream",
    JSON.stringify({ streams: ["a", 1], primaryStreams: [] }),
  ],
  ["a missing field", JSON.stringify({ streams: ["a"] })],
  [
    "an out-of-range layout",
    JSON.stringify({ streams: ["a"], primaryStreams: ["a"], layout: 99 }),
  ],
])(
  "a stream state cookie with %s is discarded and the user told",
  async (_, cookie) => {
    Cookies.set(STREAM_STATE_COOKIE, cookie);
    document.location.hash = "#access_token=token";
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(handleTwitchAuthCallback()).toMatchObject({
      reloadFromAuthStreams: undefined,
      reloadFromAuthPrimary: undefined,
      reloadFromAuthLayout: undefined,
    });
    expect(Cookies.get(STREAM_STATE_COOKIE)).toBeUndefined();
    // the toast is deferred until after startup
    await new Promise((resolve) => setTimeout(resolve));
    expect(toast.error).toHaveBeenCalledWith(
      "Couldn't restore your streams after Twitch login."
    );
  }
);

test("a stream state cookie from before layout was saved still restores", () => {
  Cookies.set(
    STREAM_STATE_COOKIE,
    JSON.stringify({ streams: ["a", "b"], primaryStreams: ["a"] })
  );
  document.location.hash = "#access_token=token";

  expect(handleTwitchAuthCallback()).toMatchObject({
    reloadFromAuthStreams: ["a", "b"],
    reloadFromAuthPrimary: ["a"],
    reloadFromAuthLayout: undefined,
  });
  expect(toast.error).not.toHaveBeenCalled();
});
