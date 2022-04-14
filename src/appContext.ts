import { createContext } from "react";
import { Settings } from "./useSettings";

export const AppContext = createContext<{
  settings?: Settings;
}>({});
export const AppProvider = AppContext.Provider;
