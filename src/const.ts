export const PROJECT_URL = "https://github.com/zbuttram/yatmv";
export const STREAM_STATE_COOKIE = "yatmv-state";
export const FETCH_FOLLOWED_INTERVAL = 1.25 * 60 * 1000;
export const FETCH_OPEN_STREAMS_INTERVAL = 60000;
export const TWITCH_CATEGORY_REFETCH = 60000;
export const TWITCH_CATEGORY_STREAMS_REFETCH = 120000;
export const CHAT_EVICT_SEC = 60 * 15;

// @ts-ignore
export const DEPLOY_CONTEXT: string | undefined = window.__DEPLOY_CONTEXT;

// TWITCH
export const TWITCH_PLAYER_URL = "https://player.twitch.tv/js/embed/v1.js";
export const TWITCH_ACCESS_TOKEN_COOKIE = "twitch_access_token";
export const TWITCH_SCOPE_COOKIE = "twitch_scope";
export const TWITCH_CLIENT_ID = process.env.REACT_APP_TWITCH_CLIENT_ID ?? "";
export const TWITCH_SCOPES = ["user:read:follows"];
export const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(
  window.location.origin
)}&response_type=token&scope=${encodeURIComponent(TWITCH_SCOPES.join(" "))}`;
