export const STREAM_STATE_COOKIE = "yatmv-state";

// TWITCH
export const TWITCH_ACCESS_TOKEN_COOKIE = "twitch_access_token";
export const TWITCH_SCOPE_COOKIE = "twitch_scope";
export const TWITCH_CLIENT_ID = "1sphvbcdy1eg1p9n122ptcloxvg7wm";
export const TWITCH_SCOPES = ["user:read:follows"];
export const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=1sphvbcdy1eg1p9n122ptcloxvg7wm&redirect_uri=${encodeURIComponent(
  window.location.origin
)}&response_type=token&scope=${encodeURIComponent(TWITCH_SCOPES.join(" "))}`;
