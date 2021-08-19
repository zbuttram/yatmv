import { useContext, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { mapValues } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePrevious } from "react-use";

import useBounding from "./useBounding";
import Log from "./log";
import { AppContext } from "./appContext";
import { TWITCH_PLAYER_URL } from "./const";
import { Layout } from "./useStreams";
import {
  faPlay,
  faVolumeDown,
  faVolumeMute,
  faVolumeOff,
  faVolumeUp,
} from "@fortawesome/free-solid-svg-icons";

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

function getChannelVolume(channel: string): number {
  const channelVolumeString = localStorage.getItem(
    getChannelVolumeKey(channel)
  );

  if (channelVolumeString) {
    const channelVolume = Number(channelVolumeString);
    if (channelVolume && !Number.isNaN(channelVolume) && channelVolume >= 0) {
      return channelVolume;
    }
  }

  return 0.5;
}

type TwitchPlayer = {
  new (
    el: HTMLElement | string,
    options: {
      channel: string;
      muted?: boolean;
      controls?: boolean;
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

  const [muted, setMuted] = useState(!isFirstSlot);
  const [volume, setVolume] = useState(getChannelVolume(channel));

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
          muted,
          // controls: false,
          width: "100%",
          height: "100%",
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // this shouldn't ever really happen, but its here anyway /shrug
    player?.current?.setChannel(channel);
  }, [channel]);

  useEffect(() => {
    player?.current?.setMuted(muted || !isFirstSlot);
  }, [muted, isFirstSlot]);

  useEffect(() => {
    player?.current?.setVolume(volume);
    setMuted(false);
    const currentVolume = player?.current?.getVolume();
    currentVolume &&
      localStorage.setItem(
        getChannelVolumeKey(channel),
        currentVolume.toString()
      );
  }, [channel, volume]);

  useEffect(() => {
    if (!player.current) {
      return;
    }

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
        style={style ? { ...style, zIndex: 10 } : { height: 0 }}
        className={classNames("transition-all")}
      />
      <Overlay
        style={style}
        primary={isPrimary}
        muted={muted}
        toggleMute={() => setMuted((state) => !state)}
        volume={volume}
        setVolume={setVolume}
      />
      <div id={posDivId} className="flex flex-grow bg-black">
        <span className={classNames("m-auto", !isPrimary && "hidden")}>
          Watching
        </span>
      </div>
    </>
  );
}

function Overlay({
  style,
  primary,
  muted,
  toggleMute,
  volume,
  setVolume,
}: {
  style:
    | {
        top: number;
        left: number;
        width: number;
        height: number;
        position: "absolute";
      }
    | undefined;
  primary: boolean;
  muted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (vol: number) => void;
}) {
  let volumeIcon;
  if (muted) {
    volumeIcon = faVolumeMute;
  } else if (volume === 0) {
    volumeIcon = faVolumeOff;
  } else if (volume > 0.5) {
    volumeIcon = faVolumeUp;
  } else {
    volumeIcon = faVolumeDown;
  }

  const pos = style
    ? {
        ...style,
        top: style.top + style.height * 0.8,
        height: style.height * 0.2,
        width: style.width * 0.5,
        zIndex: 100,
      }
    : undefined;

  return (
    <div
      style={pos ?? { height: 0 }}
      className={classNames(
        "transition-all opacity-0 hover:opacity-100 flex flex-col-reverse"
      )}
    >
      {primary ? (
        <div className="m-4 mr-auto p-2 bg-black rounded">
          <FontAwesomeIcon
            icon={volumeIcon}
            size="2x"
            fixedWidth={true}
            onClick={toggleMute}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.025}
            value={volume}
            onChange={(e) => setVolume(e.target.valueAsNumber)}
            className="ml-2"
          />
        </div>
      ) : null}
    </div>
  );
}
