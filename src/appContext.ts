import { createContext } from "react";
import { TwitchUser } from "./twitch";
import { Settings } from "./useSettings";

export const AppContext = createContext<{
  hasTwitchAuth: boolean;
  twitchUser?: TwitchUser;
  settings?: Settings;
}>({ hasTwitchAuth: false });
export const AppProvider = AppContext.Provider;
