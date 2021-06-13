import Cookies from "js-cookie";
import { camelCase, snakeCase } from "lodash";
import mapKeysDeep from "map-keys-deep-lodash";

import {
  TWITCH_ACCESS_TOKEN_COOKIE,
  TWITCH_CLIENT_ID,
  TWITCH_SCOPE_COOKIE,
  STREAM_STATE_COOKIE,
  TWITCH_SCOPES,
  TWITCH_AUTH_URL,
} from "./const";

if (!TWITCH_CLIENT_ID) {
  console.error(
    "YATMV MISSING TWITCH CLIENT ID!",
    "Twitch features will not work, register a dev app at https://dev.twitch.tv"
  );
}

let accessToken = Cookies.get(TWITCH_ACCESS_TOKEN_COOKIE);
let savedScopes = Cookies.get(TWITCH_SCOPE_COOKIE);
if (accessToken && savedScopes !== TWITCH_SCOPES.toString()) {
  Cookies.remove(TWITCH_ACCESS_TOKEN_COOKIE);
  Cookies.remove(TWITCH_SCOPE_COOKIE);
  window.location.href = TWITCH_AUTH_URL;
}

export function handleTwitchAuthCallback() {
  let reloadFromAuthStreams: string[] | undefined,
    reloadFromAuthPrimary: string | undefined,
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
        const parsedStreamState: { streams: string[]; primary: string } =
          JSON.parse(rawStreamState);
        reloadFromAuthStreams = parsedStreamState.streams;
        reloadFromAuthPrimary = parsedStreamState.primary;
      }
    }
  }
  return { reloadFromAuthStreams, reloadFromAuthPrimary, hasTwitchAuth };
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

type ParamValue = number | string | string[] | boolean | undefined;
type Params = Record<string, ParamValue>;

type PaginatedResponse<T> = { data: T[]; pagination: { cursor?: string } };

function paramsToString(params?: Params): string {
  if (!params) {
    return "";
  } else {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (!v) {
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((e) => search.append(snakeCase(k), e));
      } else {
        search.append(snakeCase(k), v.toString());
      }
    });
    return search.toString();
  }
}

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
  const parsed = await response.json();
  return mapKeysDeep(parsed, (_, key) => camelCase(key));
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
  {
    first,
    signal,
  }: Partial<{ first: number | string; signal: AbortSignal }> = {}
) {
  return callTwitch<PaginatedResponse<ChannelData>>("/search/channels", {
    signal,
    params: { query, first, live_only: true },
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

export function getStreams({
  first,
  gameId,
  userId,
  userLogin,
}: Partial<{
  first: number;
  gameId: ParamValue;
  userId: ParamValue;
  userLogin: ParamValue;
}>) {
  return callTwitch<PaginatedResponse<StreamData>>("/streams", {
    params: { first, gameId, userId, userLogin: userLogin },
  });
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

export async function getUsers({ ids }: { ids?: string[] } = {}) {
  return callTwitch<PaginatedResponse<TwitchUser>>("/users", {
    params: { id: ids },
  });
}

export async function getAuthedUser(): Promise<TwitchUser> {
  return (await getUsers()).data[0];
}

export async function getFollowedStreams({
  userId,
  first,
  after,
}: {
  userId: ParamValue;
  first?: ParamValue;
  after?: ParamValue;
}) {
  return callTwitch<PaginatedResponse<StreamData>>("/streams/followed", {
    params: { userId, first, after },
  });
}
