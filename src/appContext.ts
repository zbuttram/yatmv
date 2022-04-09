import { createContext } from "react";
import { Settings } from "./useSettings";
import { TwitchChatService } from "./TwitchChatService";

export const AppContext = createContext<{
  settings?: Settings;
  chatService?: TwitchChatService;
}>({});
export const AppProvider = AppContext.Provider;
