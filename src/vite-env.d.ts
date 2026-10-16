/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly REACT_APP_TWITCH_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
