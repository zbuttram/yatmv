import Cookies from "js-cookie";

import {
  TWITCH_ACCESS_TOKEN_COOKIE,
  TWITCH_SCOPE_COOKIE,
  TWITCH_SCOPES,
} from "./const";

function page(logins: string[], cursor?: string) {
  return {
    ok: true,
    json: async () => ({
      data: logins.map((user_login) => ({ user_login })),
      pagination: cursor ? { cursor } : {},
    }),
  };
}

test("getFollowedStreams follows the cursor across pages", async () => {
  // twitch.ts reads the token cookie when it loads
  Cookies.set(TWITCH_ACCESS_TOKEN_COOKIE, "token");
  Cookies.set(TWITCH_SCOPE_COOKIE, TWITCH_SCOPES.toString());
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(page(["a", "b"], "next"))
    .mockResolvedValueOnce(page(["c"]));
  vi.stubGlobal("fetch", fetch);
  const { getFollowedStreams } = await import("./twitch");

  const streams = await getFollowedStreams({ userId: "1" });

  expect(streams.map((s) => s.userLogin)).toEqual(["a", "b", "c"]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][0]).toContain("first=100");
  expect(fetch.mock.calls[1][0]).toContain("after=next");

  vi.unstubAllGlobals();
  Cookies.remove(TWITCH_ACCESS_TOKEN_COOKIE);
  Cookies.remove(TWITCH_SCOPE_COOKIE);
});
