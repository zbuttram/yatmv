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

function getSettings() {
  const result = localStorage.getItem(key);
  if (result) {
    try {
      return JSON.parse(result);
    } catch (e) {
      return undefined;
    }
  }
}

export default function useSettings(): [
  Settings,
  Dispatch<SetStateAction<Settings>>
] {
  const [settings, setSettings] = useState(getSettings() ?? INITIAL_SETTINGS);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(settings));
  }, [settings, setSettings]);

  return [settings, setSettings];
}
