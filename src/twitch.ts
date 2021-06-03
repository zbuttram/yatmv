import Cookies from "js-cookie";
import { camelCase } from "lodash";
import mapKeysDeep from "map-keys-deep-lodash";

import { TWITCH_ACCESS_TOKEN_COOKIE, TWITCH_CLIENT_ID } from "./const";

export type Stream = {
  displayName: string;
  broadcasterLogin?: string;
  gameId?: string;
  gameName?: string;
  id?: string;
  isLive?: boolean;
  tagsIds?: string[];
  thumbnailUrl?: string;
  title?: string;
  startedAt?: string;
  hasChannelData?: boolean;
};

export type StreamWithChannelData = Required<Stream> & { hasChannelData: true };

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

type Params = Record<string, number | string | boolean | undefined>;

function paramsToString(params?: Params) {
  if (!params) {
    return "";
  } else {
    return new URLSearchParams(
      Object.entries(params).reduce(
        (acc: string[][], [key, val]): string[][] => {
          if (val) {
            return [...acc, [key, val.toString()]];
          } else {
            return acc;
          }
        },
        []
      )
    ).toString();
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

export async function searchChannels(
  query: string,
  {
    first,
    signal,
  }: Partial<{ first: number | string; signal: AbortSignal }> = {}
): Promise<{ data: StreamWithChannelData[] }> {
  const { data, ...rest } = await callTwitch<{ data: Required<Stream>[] }>(
    "/search/channels",
    { signal, params: { first, live_only: true } }
  );

  return {
    data: data.map((res) => ({ ...res, hasChannelData: true })),
    ...rest,
  };
}

