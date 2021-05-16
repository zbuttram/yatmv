import Cookies from "js-cookie";

import { TWITCH_ACCESS_TOKEN_COOKIE, TWITCH_CLIENT_ID } from "./const";

async function callTwitch(url) {
  const accessToken = Cookies.get(TWITCH_ACCESS_TOKEN_COOKIE);
  console.log({ accessToken });
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": TWITCH_CLIENT_ID,
    },
  });
  return response.json();
}

export function searchChannels(query, { first } = {}) {
  return callTwitch(
    `https://api.twitch.tv/helix/search/channels?query=${query}&live_only=true`
  );
}
