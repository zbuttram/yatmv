import { useContext, useEffect, useMemo, useRef } from "react";
import classNames from "classnames";
import { mapValues } from "lodash";

import useBounding from "./useBounding";
import Log from "./log";
import { usePrevious } from "react-use";
import { AppContext } from "./appContext";
import { TWITCH_PLAYER_URL } from "./const";
import { Layout } from "./useStreams";

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

function getPrimarySubRect(
  position: Layout,
  layout: Layout,
  bigRect: Partial<DOMRect>
): Partial<DOMRect> {
  if (layout === Layout.OneUp) {
    return bigRect;
  }

  const { top, left, width, height } = bigRect;
  if (
    top === undefined ||
    left === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return {};
  }
  const subHeight = height / 2;
  const subWidth = width / 2;

  switch (layout) {
    case Layout.TwoUp:
      return {
        left,
        width,
        height: subHeight,
        top: position === 0 ? top : top + subHeight,
      };
    case Layout.ThreeUp:
      switch (position) {
        case 0:
          return {
            left,
            top,
            width,
            height: subHeight,
          };
        case 1:
          return {
            left,
            height: subHeight,
            width: subWidth,
            top: top + subHeight,
          };
        case 2:
          return {
            height: subHeight,
            width: subWidth,
            left: left + subWidth,
            top: top + subHeight,
          };
        default:
          return bigRect;
      }
    case Layout.FourUp:
      switch (position) {
        case 0:
          return {
            left,
            top,
            width: subWidth,
            height: subHeight,
          };
        case 1:
          return {
            top,
            width: subWidth,
            height: subHeight,
            left: left + subWidth,
          };
        case 2:
          return {
            left,
            width: subWidth,
            height: subHeight,
            top: top + subHeight,
          };
        case 3:
          return {
            width: subWidth,
            height: subHeight,
            left: left + subWidth,
            top: top + subHeight,
          };
        default:
          return bigRect;
      }
  }
}

type TwitchPlayer = {
  new (
    el: HTMLElement | string,
    options: {
      channel: string;
      muted: boolean;
      width: string;
      height: string;
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
}: {
  channel: string;
  primaryPosition: number;
  primaryContainerRect: Partial<DOMRect>;
  reloadCounter: number;
  layout: Layout;
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
    const { top, left, width, height } = isPrimary
      ? getPrimarySubRect(primaryPosition, layout, primaryContainerRect)
      : channelRect;
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
        player.current = new Twitch.Player(divId, {
          channel,
          muted: !isFirstSlot,
          width: "100%",
          height: "100%",
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

    player.current.setMuted(!isFirstSlot);
    const currentVolume = player.current.getVolume();
    currentVolume &&
      localStorage.setItem(
        getChannelVolumeKey(channel),
        currentVolume.toString()
      );

    Log("player-isPrimary-updated", channel, { boostMode, primary: isPrimary });
    const desiredQuality = isPrimary ? "chunked" : "auto";
    if (boostMode) {
      player.current.setQuality(desiredQuality);
      Log("player-quality-update", channel, desiredQuality);
    }
    if (prevBoostMode && !boostMode) {
      player.current.setQuality("auto");
    }

    function onPlay() {
      if (!player.current) {
        return;
      }
      if (boostMode) {
        const currentQuality = player.current.getQuality();
        if (currentQuality !== desiredQuality) {
          player.current.setQuality(desiredQuality);
          Log("player-set-onplay-quality", channel, desiredQuality);
        }
      }
      player.current.setMuted(!isPrimary);
    }

    player.current.addEventListener(Twitch.Player.PLAYING, onPlay);

    return () =>
      player.current &&
      player.current.removeEventListener(Twitch.Player.PLAYING, onPlay);
  }, [channel, boostMode, prevBoostMode, isPrimary, isFirstSlot]);

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
  }, [reloadCounter]);

  return (
    <>
      <div
        id={divId}
        style={style || { height: 0 }}
        className="transition-all"
      />
      <div id={posDivId} className="flex flex-grow bg-black">
        <span className={classNames("m-auto", !isPrimary && "hidden")}>
          Watching
        </span>
      </div>
    </>
  );
}
