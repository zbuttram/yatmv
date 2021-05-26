import { useEffect, useMemo, useRef } from "react";
import classNames from "classnames";
import { mapValues } from "lodash";

import useBounding from "./useBounding";

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
  _iframe: HTMLIFrameElement;
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
  const channelRect = useBounding(posDivId, { recalcInterval: 750 });

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    player?.current?.setChannel(channel);
  }, [channel]);

  useEffect(() => {
    player?.current?.setMuted(!primary);
  }, [primary]);

  return (
    <>
      <div id={posDivId} className="aspect-w-16 aspect-h-9 flex-grow bg-black">
        <div className="flex">
          <span className={classNames("m-auto", !primary && "hidden")}>
            Watching
          </span>
        </div>
      </div>
      <div id={divId} style={style} className="transition-all" />
    </>
  );
}
