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

// twitch.ts reads the token cookie when it loads, so set it before importing
beforeAll(() => {
  Cookies.set(TWITCH_ACCESS_TOKEN_COOKIE, "token");
  Cookies.set(TWITCH_SCOPE_COOKIE, TWITCH_SCOPES.toString());
});

afterAll(() => {
  Cookies.remove(TWITCH_ACCESS_TOKEN_COOKIE);
  Cookies.remove(TWITCH_SCOPE_COOKIE);
});

afterEach(() => vi.unstubAllGlobals());

async function followedStreamsWith(...pages: ReturnType<typeof page>[]) {
  const fetch = vi.fn();
  pages.forEach((p) => fetch.mockResolvedValueOnce(p));
  vi.stubGlobal("fetch", fetch);
  // keep ./twitch out of static imports: it must load after the cookies are set
  const { getFollowedStreams } = await import("./twitch");
  const streams = await getFollowedStreams({ userId: "1" });
  return { streams: streams.map((s) => s.userLogin), fetch };
}

test("getFollowedStreams follows the cursor across pages", async () => {
  const { streams, fetch } = await followedStreamsWith(
    page(["a", "b"], "next"),
    page(["c"])
  );

  expect(streams).toEqual(["a", "b", "c"]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[0][0]).toContain("first=100");
  expect(fetch.mock.calls[1][0]).toContain("after=next");
});

test("getFollowedStreams stops at 5 pages", async () => {
  const pages = Array.from({ length: 8 }, (_, i) => page([`s${i}`], "next"));
  const { streams, fetch } = await followedStreamsWith(...pages);

  expect(fetch).toHaveBeenCalledTimes(5);
  expect(streams).toHaveLength(5);
});

test("getFollowedStreams stops at an empty page even with a cursor", async () => {
  const { streams, fetch } = await followedStreamsWith(
    page(["a"], "p2"),
    page([], "p3"),
    page(["never"])
  );

  expect(fetch).toHaveBeenCalledTimes(2);
  expect(streams).toEqual(["a"]);
});
