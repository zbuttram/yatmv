import { Dispatch, SetStateAction, useEffect, useState } from "react";

const INITIAL_SETTINGS = {
  boostMode: false,
  showChat: true,
  fullHeightPlayer: false,
  sidebarOpen: true,
};

export type Settings = typeof INITIAL_SETTINGS;

const key = "yatmv-settings";

function getSettings() {
  const result = localStorage.getItem(key);
  if (result) {
    try {
      return Object.assign(INITIAL_SETTINGS, JSON.parse(result));
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
    setTimeout(() => localStorage.setItem(key, JSON.stringify(settings)));
  }, [settings]);

  return [settings, setSettings];
}
