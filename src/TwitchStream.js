/* global Twitch */

import { useEffect, useRef, useState } from "react";
import classNames from "classnames";

export default function TwitchStream({
  channel,
  primary = false,
  primaryContainerRect,
  className,
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

  const { top, left, width, height } = primaryContainerRect;

  return (
    <div
      id={divId}
      style={
        primary ? { top, left, width, height, position: "absolute" } : undefined
      }
      className={classNames(
        className,
        "transition-all",
        primary ? "" : "flex-grow"
      )}
    ></div>
  );
}
