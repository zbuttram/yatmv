import {
  createContext,
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
} from "react";

const INITIAL_SETTINGS = {
  boostMode: false,
  showChat: true,
  fullHeightPlayer: false,
};

export type Settings = typeof INITIAL_SETTINGS;

const key = "yatmv-settings";
export const SettingsContext = createContext(INITIAL_SETTINGS);
export const SettingsProvider = SettingsContext.Provider;

export default function useSettings(): [
  Settings,
  Dispatch<SetStateAction<Settings>>
] {
  const [settings, setSettings] = useState(
    JSON.parse(localStorage.getItem(key) ?? "undefined") ?? INITIAL_SETTINGS
  );

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(settings));
  }, [settings, setSettings]);

  return [settings, setSettings];
}
