import { act, cleanup, render } from "@testing-library/react";

import { AppProvider } from "./appContext";
import type { Settings } from "./useSettings";

// stands in for the embed's Twitch.Player; getVolume() returns the embed's own
// volume, as the real cached getter does until the iframe reports the restore
class FakePlayer {
  static READY = "ready";
  static PLAYING = "playing";
  static instances: FakePlayer[] = [];
  listeners: Record<string, (() => void)[]> = {};
  setVolume = vi.fn();
  setMuted = vi.fn();
  setQuality = vi.fn();
  getVolume = vi.fn(() => 1);
  getQuality = vi.fn(() => "");
  isPaused = vi.fn(() => true);
  play = vi.fn();
  pause = vi.fn();
  setChannel = vi.fn();
  constructor() {
    FakePlayer.instances.push(this);
  }
  addEventListener(event: string, cb: () => void) {
    (this.listeners[event] ??= []).push(cb);
  }
  removeEventListener(event: string, cb: () => void) {
    this.listeners[event] = (this.listeners[event] ?? []).filter(
      (l) => l !== cb
    );
  }
  fire(event: string) {
    act(() => (this.listeners[event] ?? []).forEach((cb) => cb()));
  }
}

const settings = { boostMode: false, pauseHiddenPlayers: false } as Settings;
const VOLUME_KEY = "player-channel-volume-foo";

async function renderStream(primaryPosition: number) {
  // the script loader keeps module-level state, so load a fresh copy per test
  vi.resetModules();
  const { default: TwitchStream } = await import("./TwitchStream");
  const props = {
    channel: "foo",
    primaryContainerRect: {},
    reloadCounter: 0,
    layout: 1,
  };
  const { rerender } = render(
    <AppProvider value={{ settings }}>
      <TwitchStream {...props} primaryPosition={primaryPosition} />
    </AppProvider>
  );
  act(() => {
    document
      .querySelector('script[src*="player.twitch.tv"]')!
      .dispatchEvent(new Event("load"));
  });
  const player = FakePlayer.instances.at(-1)!;
  return {
    player,
    moveTo(position: number) {
      rerender(
        <AppProvider value={{ settings }}>
          <TwitchStream {...props} primaryPosition={position} />
        </AppProvider>
      );
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("Twitch", { Player: FakePlayer });
  FakePlayer.instances = [];
  document.querySelectorAll("script").forEach((s) => s.remove());
  localStorage.clear();
});

afterEach(() => {
  cleanup(); // unmount while the Twitch global still exists
  vi.unstubAllGlobals();
});

test("restores the saved volume and mutes non-first slots on READY", async () => {
  localStorage.setItem(VOLUME_KEY, "0.3");
  const { player } = await renderStream(1);
  expect(player.setMuted).not.toHaveBeenCalled();

  player.fire("ready");

  expect(player.setVolume).toHaveBeenCalledWith(0.3);
  expect(player.setMuted).toHaveBeenLastCalledWith(true);
  // the READY run must not save the not-yet-restored volume over the saved one
  expect(localStorage.getItem(VOLUME_KEY)).toBe("0.3");
});

test("unmutes the first slot on READY", async () => {
  const { player } = await renderStream(0);
  player.fire("ready");
  expect(player.setMuted).toHaveBeenLastCalledWith(false);
});

test("re-applies mute when READY fires again after a reload", async () => {
  const { player, moveTo } = await renderStream(0);
  player.fire("ready");
  moveTo(1);
  expect(player.setMuted).toHaveBeenLastCalledWith(true);

  // a reload brings the iframe back with its constructor options (unmuted)
  player.setMuted.mockClear();
  player.fire("ready");
  expect(player.setMuted).toHaveBeenLastCalledWith(true);
});
