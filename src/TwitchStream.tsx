import { ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import classNames from "classnames";
import { mapValues } from "lodash";

import useBounding from "./useBounding";
import Log from "./log";
import { usePrevious } from "react-use";
import { AppContext } from "./appContext";
import { TWITCH_PLAYER_URL } from "./const";
import { getPrimarySubRect, Layout } from "./layout";

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
  _iframe: HTMLIFrameElement;
  addEventListener(event: string, callback: () => void): void;
  removeEventListener(event: string, callback: () => void): void;
  PLAYING: "playing";
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
  const { boostMode } = settings ?? {};
  const prevBoostMode = usePrevious(boostMode);

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

  const player = useRef<TwitchPlayer>();

  useEffect(() => {
    if (!player.current) {
      loadWithScript(() => {
        if (player.current) {
          /*
           * Sometimes in React 18 (concurrent mode), by the time we load the script, loadWithScript has been fired again already.
           * This leads to two players getting created, so we bail check again and bail out here if the player is already created.
           */
          return;
        }

        player.current = new Twitch.Player(divId, {
          channel,
          muted: !isFirstSlot,
          width: "100%",
          height: "100%",
          quality: boostMode ? (isPrimary ? "chunked" : "auto") : undefined,
        });

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
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // this shouldn't ever really happen, but its here anyway /shrug
    player?.current?.setChannel(channel);
  }, [channel]);

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
    const currentVolume = player.current.getVolume();
    currentVolume &&
      localStorage.setItem(
        getChannelVolumeKey(channel),
        currentVolume.toString()
      );

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
      if (prevBoostMode && !boostMode) {
        player.current.setQuality("auto");
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
  }, [
    channel,
    boostMode,
    prevBoostMode,
    primaryPosition,
    isPrimary,
    isFirstSlot,
  ]);

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
