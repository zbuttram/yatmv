import Cookies from "js-cookie";
import { camelCase, snakeCase } from "lodash";
import mapKeysDeep from "map-keys-deep-lodash";

import { TWITCH_ACCESS_TOKEN_COOKIE, TWITCH_CLIENT_ID } from "./const";

let accessToken = Cookies.get(TWITCH_ACCESS_TOKEN_COOKIE);

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

type PaginatedResponse<T> = { data: T; pagination: { cursor?: string } };

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

async function callTwitch<T>(
  path,
  {
    params,
    signal,
  }: {
    params?: Params;
    signal?: AbortSignal;
  }
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
  return callTwitch<PaginatedResponse<ChannelData[]>>("/search/channels", {
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
  return callTwitch<PaginatedResponse<StreamData[]>>("/streams", {
    params: { first, gameId, userId, userLogin: userLogin },
  });
}

// export async function getFollowedStreams() {}
