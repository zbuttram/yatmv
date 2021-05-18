/* global Twitch */

import { useEffect, useRef } from "react";
import classNames from "classnames";

import useBounding from "./useBounding";

export default function TwitchStream({
  channel,
  primary = false,
  primaryContainerRect,
}) {
  const divId = `twitch-stream-embed-${channel}`;

  const player = useRef();

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
    if (player.current) {
      player.current.setChannel(channel);
    }
  }, [channel]);

  useEffect(() => {
    if (!player.current) return;
    player.current.setMuted(!primary);
  }, [primary]);

  const posDivId = divId + "-pos";
  const channelRect = useBounding(posDivId);

  // console.log({ channelRect, primaryContainerRect });

  const { top, left, width, height } = primary
    ? primaryContainerRect
    : channelRect;

  let style;
  if (top !== undefined && left !== undefined && width && height) {
    style = { top, left, width, height, position: "absolute" };
  }

  return (
    <>
      <div id={posDivId} className="flex-grow flex">
        <span className={classNames("m-auto", !primary && "hidden")}>
          Watching
        </span>
      </div>
      <div id={divId} style={style} className={"transition-all"} />
    </>
  );
}
