import {
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import classNames from "classnames";
import { mapValues } from "lodash-es";
import { usePrevious } from "react-use";

import useBounding from "./useBounding";
import Log from "./log";
import { AppContext } from "./appContext";
import { TWITCH_PLAYER_URL } from "./const";
import { getPrimarySubRect, Layout } from "./layout";
import { useDebounce } from "./useDebounce";

let scriptElement: HTMLScriptElement | null = null;
let scriptLoaded = false;
function loadWithScript(callback) {
  if (!scriptElement) {
    scriptElement = document.createElement("script");
    scriptElement.setAttribute("type", "text/javascript");
    scriptElement.setAttribute("src", TWITCH_PLAYER_URL);
    document.body.appendChild(scriptElement);
  }
  if (scriptLoaded) {
    callback();
  } else {
    scriptElement.addEventListener("load", () => {
      scriptLoaded = true;
      callback();
    });
  }
}

function getChannelVolumeKey(channel) {
  return `player-channel-volume-${channel.toLowerCase()}`;
}

type TwitchPlayer = {
  new (
    el: HTMLElement | string,
    options: {
      channel: string;
      muted: boolean;
      width: string;
      height: string;
      quality?: string;
    }
  ): TwitchPlayer;
  setChannel(channel: string): void;
  getMuted(): boolean;
  setMuted(muted: boolean): void;
  getVolume(): number;
  setVolume(volumeLevel: number): void;
  setQuality(name: string): void;
  getQuality(): string;
  getQualities(): any[];
  isPaused(): boolean;
  play(): void;
  pause(): void;
  _iframe: HTMLIFrameElement;
  addEventListener(event: string, callback: () => void): void;
  removeEventListener(event: string, callback: () => void): void;
  PLAYING: "playing";
  READY: "ready";
  // there are some other properties and methods in here, not all of them documented: https://dev.twitch.tv/docs/embed/video-and-clips
};

declare var Twitch: { Player: TwitchPlayer };

export default function TwitchStream({
  channel,
  primaryPosition,
  primaryContainerRect,
  reloadCounter,
  layout,
  className,
  overlay,
}: {
  channel: string;
  primaryPosition: number;
  primaryContainerRect: Partial<DOMRect>;
  reloadCounter: number;
  layout: Layout;
  className?: string;
  overlay?: ReactNode;
}) {
  const divId = `twitch-stream-embed-${channel}`;
  const isPrimary = primaryPosition > -1;
  const isFirstSlot = primaryPosition === 0;

  const posDivId = divId + "-pos";
  const channelRect = useBounding(posDivId);

  const { settings } = useContext(AppContext);
  const { boostMode, pauseHiddenPlayers } = settings ?? {};
  const prevSettings = usePrevious(settings);
  const {
    boostMode: prevBoostMode,
    pauseHiddenPlayers: prevPauseHiddenPlayers,
  } = prevSettings ?? {};

  const style = useMemo(():
    | {
        top: number;
        left: number;
        width: number;
        height: number;
        position: "absolute";
      }
    | undefined => {
    const rect = isPrimary
      ? getPrimarySubRect(primaryPosition, layout, primaryContainerRect)
      : channelRect;
    const { top, left, width, height } = rect ?? {};
    if (top !== undefined && left !== undefined && width && height) {
      return {
        position: "absolute",
        ...mapValues({ top, left, width, height }, (val) => {
          if (typeof val === "number") {
            return Math.round(val);
          } else {
            return val;
          }
        }),
      };
    }
  }, [isPrimary, primaryContainerRect, channelRect, primaryPosition, layout]);

  const player = useRef<TwitchPlayer>(undefined);
  // bumped on each READY event, including after an iframe reload. Before READY,
  // commands posted to the iframe are lost and getters (isPaused/getVolume/
  // getQuality) return placeholder defaults, so the pause and mute/quality
  // effects re-run on this
  const [readyCount, setReadyCount] = useState(0);
  const lastReadyCount = useRef(0);

  useEffect(() => {
    if (!player.current) {
      loadWithScript(() => {
        if (player.current) {
          // StrictMode (dev) runs this mount effect twice, so a second
          // callback can arrive after the first created the player. Bail out
          // to avoid creating two players.
          return;
        }

        player.current = new Twitch.Player(divId, {
          channel,
          muted: !isFirstSlot,
          width: "100%",
          height: "100%",
          quality: boostMode ? (isPrimary ? "chunked" : "auto") : undefined,
        });

        player.current.addEventListener(Twitch.Player.READY, () => {
          const channelVolumeString = localStorage.getItem(
            getChannelVolumeKey(channel)
          );

          if (channelVolumeString) {
            const channelVolume = Number(channelVolumeString);
            if (
              channelVolume &&
              !Number.isNaN(channelVolume) &&
              channelVolume >= 0
            ) {
              player.current?.setVolume(channelVolume);
            }
          }

          setReadyCount((count) => count + 1);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // this shouldn't ever really happen, but its here anyway /shrug
    player?.current?.setChannel(channel);
  }, [channel]);

  const belowViewport =
    channelRect.top && channelRect.top > window.innerHeight + window.scrollY;

  const shouldPause = !isPrimary && belowViewport;
  const debouncedShouldPause = useDebounce(shouldPause, 1000);

  useEffect(() => {
    if (!player.current) {
      return;
    }

    if (pauseHiddenPlayers) {
      const paused = player.current?.isPaused();
      if (debouncedShouldPause && !paused) {
        player.current.pause();
      } else if (paused && !shouldPause) {
        player.current.play();
      }
    } else if (prevPauseHiddenPlayers) {
      player.current.play();
    }

    // a player that loads below the viewport reports paused (not started yet)
    // above, then autoplays; pause it as soon as it starts playing
    if (pauseHiddenPlayers && debouncedShouldPause && shouldPause) {
      const hiddenPlayer = player.current;
      const pauseOnPlay = () => hiddenPlayer.pause();
      hiddenPlayer.addEventListener(Twitch.Player.PLAYING, pauseOnPlay);
      return () =>
        hiddenPlayer.removeEventListener(Twitch.Player.PLAYING, pauseOnPlay);
    }
  }, [
    shouldPause,
    debouncedShouldPause,
    pauseHiddenPlayers,
    prevPauseHiddenPlayers,
    readyCount,
  ]);

  useEffect(() => {
    if (!player.current) {
      return;
    }

    Log("player-state-updated", channel, {
      boostMode,
      primary: isPrimary,
      isFirstSlot,
      currentPlayerQuality: player.current?.getQuality(),
    });

    player.current.setMuted(!isFirstSlot);
    // on a run caused by READY, getVolume() still reports the volume from
    // before the saved one was restored, so saving it would overwrite it
    if (lastReadyCount.current === readyCount) {
      const currentVolume = player.current.getVolume();
      currentVolume &&
        localStorage.setItem(
          getChannelVolumeKey(channel),
          currentVolume.toString()
        );
    }
    lastReadyCount.current = readyCount;

    function updateQuality() {
      if (!player.current) {
        return;
      }
      if (boostMode) {
        const currentQuality = player.current?.getQuality();
        const desiredQuality = isPrimary ? "chunked" : "auto";
        Log("player-quality-check", channel, {
          currentQuality,
          desiredQuality,
        });
        if (currentQuality !== desiredQuality) {
          player.current.setQuality(desiredQuality);
          Log("player-quality-update", channel, desiredQuality);
        }
      }
    }
    updateQuality();

    function onPlay() {
      Log("player-onplay", channel);
      player.current?.setMuted(!isFirstSlot);
      updateQuality();
    }

    player.current?.addEventListener(Twitch.Player.PLAYING, onPlay);
    return () => {
      player.current?.removeEventListener(Twitch.Player.PLAYING, onPlay);
    };
  }, [channel, boostMode, primaryPosition, isPrimary, isFirstSlot, readyCount]);

  useEffect(() => {
    if (prevBoostMode && !boostMode) {
      player.current?.setQuality("auto");
    }
  }, [boostMode, prevBoostMode]);

  const prevReloadCounter = usePrevious(reloadCounter);
  useEffect(() => {
    if (
      reloadCounter > 0 &&
      reloadCounter !== prevReloadCounter &&
      player.current &&
      player.current._iframe
    ) {
      // eslint-disable-next-line no-self-assign
      player.current._iframe.src = player.current._iframe.src;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadCounter]);

  return (
    <>
      <div
        id={divId}
        style={style || { height: 0 }}
        className="transition-all"
      />
      {overlay ? (
        <div
          style={style || { height: 0 }}
          className="z-20 pointer-events-none"
        >
          {overlay}
        </div>
      ) : null}
      <div
        id={posDivId}
        className={classNames("flex aspect-video bg-black", className)}
      >
        <span className={classNames("m-auto", !isPrimary && "hidden")}>
          Watching
        </span>
      </div>
    </>
  );
}
