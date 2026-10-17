import { act, cleanup, render } from "@testing-library/react";

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

let settings = { boostMode: false, pauseHiddenPlayers: false } as Settings;
const VOLUME_KEY = "player-channel-volume-foo";

async function renderStream(primaryPosition: number) {
  // the script loader keeps module-level state, so load a fresh copy per test
  vi.resetModules();
  const { default: TwitchStream } = await import("./TwitchStream");
  // same fresh module instance as TwitchStream's, or the context won't match
  const { AppProvider } = await import("./appContext");
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
  settings = { boostMode: false, pauseHiddenPlayers: false } as Settings;
  vi.stubGlobal("Twitch", { Player: FakePlayer });
  FakePlayer.instances = [];
  document.querySelectorAll("script").forEach((s) => s.remove());
  localStorage.clear();
});

afterEach(() => {
  cleanup(); // unmount while the Twitch global still exists
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
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

function placeSlotAt(top: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    left: 0,
    right: 100,
    bottom: top + 56,
    width: 100,
    height: 56,
  } as DOMRect);
}

async function renderWithPauseHidden(slotTop: number) {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ],
  });
  settings = { boostMode: false, pauseHiddenPlayers: true } as Settings;
  placeSlotAt(slotTop);
  // not primary, so it may be paused when hidden
  const rendered = await renderStream(-1);
  settle();
  rendered.player.fire("ready");
  return rendered;
}

/** Let useBounding re-measure the slot, then the 1s pause debounce elapse. */
function settle() {
  act(() => vi.advanceTimersByTime(100));
  act(() => vi.advanceTimersByTime(1100));
}

const BELOW_VIEWPORT = window.innerHeight + 500;

test("a hidden player that starts playing below the viewport gets paused", async () => {
  const { player } = await renderWithPauseHidden(BELOW_VIEWPORT);
  // before it starts, the embed reports paused, so nothing is paused yet
  expect(player.pause).not.toHaveBeenCalled();

  player.fire("playing");

  expect(player.pause).toHaveBeenCalled();
});

test("a visible player isn't paused when it starts playing", async () => {
  const { player } = await renderWithPauseHidden(0);
  player.fire("playing");
  expect(player.pause).not.toHaveBeenCalled();
});

test("a hidden player scrolled back into view plays and stays playing", async () => {
  const { player } = await renderWithPauseHidden(BELOW_VIEWPORT);
  player.fire("playing");
  expect(player.pause).toHaveBeenCalledTimes(1);

  placeSlotAt(0);
  settle();

  expect(player.play).toHaveBeenCalled();
  // play() makes it fire PLAYING again; that must not pause it
  player.fire("playing");
  expect(player.pause).toHaveBeenCalledTimes(1);
});
