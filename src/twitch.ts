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
};

export type StreamWithTwitchData = Required<Stream> & { hasTwitchData: true };

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

async function callTwitch<T>(url, init): Promise<T> {
  if (!checkTwitchAuth()) {
    throw new Error("Missing Twitch Access Token");
  }
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": TWITCH_CLIENT_ID,
    },
    ...init,
  });
  const parsed = await response.json();
  return mapKeysDeep(parsed, (_, key) => camelCase(key));
}

export function searchChannels(
  query: string,
  { first, signal }: Partial<{ first: number; signal: AbortSignal }> = {}
) {
  const queryString = new URLSearchParams({
    query,
    live_only: "true",
    ...(first ? { first: first.toString() } : {}),
  });
  return callTwitch<{ data: StreamWithTwitchData[] }>(
    "https://api.twitch.tv/helix/search/channels?" + queryString,
    { signal }
  );
}
