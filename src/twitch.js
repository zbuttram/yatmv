import Cookies from "js-cookie";

import { TWITCH_ACCESS_TOKEN_COOKIE, TWITCH_CLIENT_ID } from "./const";

let accessToken = Cookies.get(TWITCH_ACCESS_TOKEN_COOKIE);

async function callTwitch(url, init) {
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
  return response.json();
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

export function searchChannels(query, { first, signal } = {}) {
  return callTwitch(
    `https://api.twitch.tv/helix/search/channels?query=${query}&live_only=true`,
    { signal }
  );
}
