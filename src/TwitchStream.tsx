import { useEffect, useMemo, useRef, useContext } from "react";
import classNames from "classnames";
import { mapValues } from "lodash";

import useBounding from "./useBounding";
import Log from "./log";
import { usePrevious } from "react-use";
import { AppContext } from "./appContext";

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
  setMuted(muted: boolean): void;
  setQuality(name: string): void;
  getQualities(): any[];
  _iframe: HTMLIFrameElement;
  addEventListener(event: string, callback: () => void): any;
  PLAYING: "playing";
  // there are some other properties and methods in here, not all of them documented
};

declare var Twitch: { Player: TwitchPlayer };

export default function TwitchStream({
  channel,
  primary = false,
  primaryContainerRect,
}: {
  channel: string;
  primary: boolean;
  primaryContainerRect: Partial<DOMRect>;
}) {
  const divId = `twitch-stream-embed-${channel}`;

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
    const { top, left, width, height } = primary
      ? primaryContainerRect
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
  }, [primary, primaryContainerRect, channelRect]);

  const player = useRef<TwitchPlayer>();

  useEffect(() => {
    if (!player.current) {
      player.current = new Twitch.Player(divId, {
        channel,
        muted: !primary,
        width: "100%",
        height: "100%",
      });

      if (boostMode) {
        player?.current?.setQuality(primary ? "chunked" : "auto");
      }

      player.current.addEventListener(Twitch.Player.PLAYING, () => {
        const qualities = player.current?.getQualities();
        Log({ channel, qualities });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    player?.current?.setChannel(channel);
  }, [channel]);

  useEffect(() => {
    player?.current?.setMuted(!primary);
    if (boostMode) {
      player?.current?.setQuality(primary ? "chunked" : "auto");
    }
    if (prevBoostMode && !boostMode) {
      player?.current?.setQuality("auto");
    }
  }, [boostMode, prevBoostMode, primary]);

  return (
    <>
      <div
        id={divId}
        style={style || { height: 0 }}
        className="transition-all"
      />
      <div id={posDivId} className="flex flex-grow bg-black">
        <span className={classNames("m-auto", !primary && "hidden")}>
          Watching
        </span>
      </div>
    </>
  );
}
