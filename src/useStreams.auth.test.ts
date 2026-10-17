import { act } from "@testing-library/react";
import Cookies from "js-cookie";

import { renderStreams } from "./renderStreams";
import { handleTwitchAuthCallback } from "./twitch";
import {
  STREAM_STATE_COOKIE,
  TWITCH_ACCESS_TOKEN_COOKIE,
  TWITCH_SCOPE_COOKIE,
} from "./const";

// kept in its own file: handleTwitchAuthCallback stores the token in
// module-level state in twitch.ts, which would leak into other tests
afterEach(() => {
  Cookies.remove(STREAM_STATE_COOKIE);
  Cookies.remove(TWITCH_ACCESS_TOKEN_COOKIE);
  Cookies.remove(TWITCH_SCOPE_COOKIE);
  document.location.hash = "";
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
