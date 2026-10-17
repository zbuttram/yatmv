import Cookies from "js-cookie";
import { camelCase, isPlainObject, mapKeys, mapValues } from "lodash-es";

import { useQuery } from "@tanstack/react-query";
import {
  STREAM_STATE_COOKIE,
  TWITCH_ACCESS_TOKEN_COOKIE,
  TWITCH_AUTH_URL,
  TWITCH_CLIENT_ID,
  TWITCH_SCOPE_COOKIE,
  TWITCH_SCOPES,
} from "./const";
import { toast } from "react-hot-toast";
import { Layout, MAX_LAYOUT } from "./layout";
import { Params, paramsToString, ParamValue } from "./utils";

if (!TWITCH_CLIENT_ID) {
  throw new Error(
    "YATMV MISSING TWITCH CLIENT ID!\n" +
      "Twitch features will not work, register a dev app at https://dev.twitch.tv\n" +
      "Set `REACT_APP_TWITCH_CLIENT_ID` in your .env"
  );
}

export function removeTwitchAuth(tryReAuth = false) {
  Cookies.remove(TWITCH_ACCESS_TOKEN_COOKIE);
  Cookies.remove(TWITCH_SCOPE_COOKIE);
  if (tryReAuth) {
    window.location.href = TWITCH_AUTH_URL;
  }
}

let accessToken = Cookies.get(TWITCH_ACCESS_TOKEN_COOKIE);
let savedScopes = Cookies.get(TWITCH_SCOPE_COOKIE);
if (accessToken && savedScopes !== TWITCH_SCOPES.toString()) {
  removeTwitchAuth(true);
}

export function handleTwitchAuthCallback() {
  let reloadFromAuthStreams: string[] | undefined,
    reloadFromAuthPrimary: string[] | undefined,
    reloadFromAuthLayout: Layout | undefined,
    hasTwitchAuth: boolean = !!accessToken;

  if (document.location.hash) {
    const hashParams = new URLSearchParams(document.location.hash.slice(1));
    const accessTokenParam = hashParams.get("access_token");
    if (accessTokenParam) {
      accessToken = accessTokenParam;
      const cookieOptions = {
        expires: 59,
      };
      Cookies.set(TWITCH_ACCESS_TOKEN_COOKIE, accessTokenParam, cookieOptions);
      Cookies.set(TWITCH_SCOPE_COOKIE, TWITCH_SCOPES.toString(), cookieOptions);
      hasTwitchAuth = true;
      document.location.hash = "";
      const rawStreamState = Cookies.get(STREAM_STATE_COOKIE);
      if (rawStreamState) {
        const restored = parseStreamStateCookie(rawStreamState);
        if (restored) {
          reloadFromAuthStreams = restored.streams;
          reloadFromAuthPrimary = restored.primaryStreams;
          reloadFromAuthLayout = restored.layout;
        } else {
          // the login redirect lands on the bare origin, so this cookie was
          // the only copy of the user's streams; say so rather than silently
          // starting empty. deferred because this runs while the app's
          // initial state is built, before anything has rendered
          console.error("Ignoring invalid stream state cookie", rawStreamState);
          Cookies.remove(STREAM_STATE_COOKIE);
          setTimeout(() =>
            toast.error("Couldn't restore your streams after Twitch login.")
          );
        }
      }
    }
  }
  return {
    reloadFromAuthStreams,
    reloadFromAuthPrimary,
    reloadFromAuthLayout,
    hasTwitchAuth,
  };
}

/** The saved stream state, or null if any part of it is missing or invalid. */
function parseStreamStateCookie(raw: string): {
  streams: string[];
  primaryStreams: string[];
  layout: Layout | undefined;
} | null {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((s) => typeof s === "string");
  // layout is optional: cookies from before it was saved don't have it
  const layoutValid =
    parsed?.layout === undefined ||
    (Number.isInteger(parsed.layout) &&
      parsed.layout >= 0 &&
      parsed.layout <= MAX_LAYOUT);
  if (
    !isStringArray(parsed?.streams) ||
    !isStringArray(parsed.primaryStreams) ||
    !layoutValid
  ) {
    return null;
  }
  return {
    streams: parsed.streams,
    primaryStreams: parsed.primaryStreams,
    layout: parsed.layout,
  };
}

export function checkTwitchAuth() {
  if (accessToken) {
    return true;
  } else {
    const accessTokenCookie = Cookies.get(TWITCH_ACCESS_TOKEN_COOKIE);
    if (accessTokenCookie) {
      accessToken = accessTokenCookie;
      return true;
    } else {
      return false;
    }
  }
}

export type PaginatedResponse<T> = {
  data: T[];
  pagination: { cursor?: string };
};
type PaginationParams = {
  after?: ParamValue;
  before?: ParamValue;
  first?: ParamValue;
};

async function callTwitch<T = any>(
  path,
  {
    params,
    signal,
  }: {
    params?: Params;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  if (!checkTwitchAuth()) {
    throw new Error("Missing Twitch Access Token");
  }

  if (path.charAt(0) !== "/") {
    path = "/" + path;
  }

  const url = `https://api.twitch.tv/helix${path}?${paramsToString(params)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": TWITCH_CLIENT_ID,
    },
    signal,
  });
  if (!response.ok) {
    if (response.status === 401) {
      console.error(
        "Twitch API returned 401, token is expired, trying to re-auth..."
      );
      removeTwitchAuth(true);
    }
    throw new Error(
      `Twitch API response not OK: (${response.status}) ${response.statusText}`
    );
  }
  const parsed = await response.json();
  return camelCaseKeysDeep(parsed);
}

function camelCaseKeysDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(camelCaseKeysDeep);
  }
  if (isPlainObject(value)) {
    return mapValues(
      mapKeys(value, (_, key) => camelCase(key)),
      camelCaseKeysDeep
    );
  }
  return value;
}

export type ChannelData = {
  displayName: string;
  broadcasterLogin: string;
  gameId: string;
  gameName: string;
  id: string;
  isLive: boolean;
  tagsIds: string[];
  thumbnailUrl: string;
  title: string;
  startedAt: string;
};

export function searchChannels(
  query: string,
  { signal, ...params }: { signal?: AbortSignal } & PaginationParams = {}
) {
  return callTwitch<PaginatedResponse<ChannelData>>("/search/channels", {
    signal,
    params: { ...params, query, live_only: true },
  });
}

export type StreamData = {
  userId: string;
  userLogin: string;
  userName: string;
  gameId: string;
  gameName: string;
  type: "live" | "";
  id: string;
  viewerCount: number;
  language: string;
  thumbnailUrl: string;
  isMature: boolean;
  tagsIds: string[];
  title: string;
  startedAt: string;
};

type StreamQueryParams = {
  gameId: ParamValue;
  userId: ParamValue;
  userLogin: ParamValue;
  language: ParamValue;
};

export function getStreams({
  first,
  gameId,
  userId,
  userLogin,
  after,
  language,
}: Partial<PaginationParams & StreamQueryParams> = {}) {
  return callTwitch<PaginatedResponse<StreamData>>("/streams", {
    params: { first, after, gameId, userId, userLogin, language },
  });
}

export async function getStream({
  gameId,
  userId,
  userLogin,
}: Partial<StreamQueryParams>): Promise<StreamData> {
  const response = await getStreams({ first: 1, gameId, userId, userLogin });
  if (response?.data[0]) {
    return response.data[0];
  } else {
    throw new Error(
      "Could not fetch stream data from Twitch (stream is likely offline)"
    );
  }
}

export type TwitchUser = {
  id: string;
  displayName: string;
  description: string;
  login: string;
  offlineImageUrl: string;
  profileImageUrl: string;
  broadcasterType: "partner" | "affiliate" | "";
  type: "staff" | "admin" | "global_mod" | "";
  viewCount: number;
  createdAt: string;
};

type GetUsersParams = { ids?: string[]; logins?: string[] };

export function getUsers({ ids, logins }: GetUsersParams = {}) {
  return callTwitch<PaginatedResponse<TwitchUser>>("/users", {
    params: { id: ids, login: logins },
  });
}

export async function getUser({
  id,
  login,
}: Partial<{ id: string; login: string }>) {
  const params: GetUsersParams = {};
  if (id) {
    params.ids = [id];
  }
  if (login) {
    params.logins = [login];
  }
  const response = await getUsers(params);
  if (response?.data[0]) {
    return response.data[0];
  } else {
    throw new Error("Could not fetch user data from Twitch");
  }
}

export async function getAuthedUser(): Promise<TwitchUser> {
  return (await getUsers()).data[0];
}

export function useTwitchUser(login) {
  return useQuery({
    queryKey: ["twitchUser", login],
    queryFn: () => getUser({ login }),
    enabled: checkTwitchAuth() && !!login,
  });
}

const FOLLOWED_STREAMS_MAX_PAGES = 5;

/**
 * All live followed streams. The endpoint returns at most 100 per page (also
 * its default), so follow the cursor (up to 500 streams). With more live
 * followed channels than one page holds, streams drop in and out of the list,
 * which shows up as false "went live" toasts.
 */
export async function getFollowedStreams({ userId }: { userId: ParamValue }) {
  const streams: StreamData[] = [];
  let after: string | undefined;
  for (let page = 0; page < FOLLOWED_STREAMS_MAX_PAGES; page++) {
    const response = await callTwitch<PaginatedResponse<StreamData>>(
      "/streams/followed",
      { params: { userId, first: 100, after } }
    );
    streams.push(...response.data);
    after = response.pagination?.cursor;
    if (!after || !response.data.length) break;
  }
  return streams;
}

export type CategoryData = {
  id: string;
  name: string;
  boxArtUrl: string;
};

export function searchCategories({
  query,
  first,
  after,
}: {
  query: string;
} & PaginationParams) {
  return callTwitch<PaginatedResponse<CategoryData>>("/search/categories", {
    params: { query, first, after },
  });
}

export function getTopGames({
  first,
  after,
}: { first?: ParamValue; after?: ParamValue } = {}) {
  return callTwitch<PaginatedResponse<CategoryData>>("/games/top", {
    params: { first, after },
  });
}
