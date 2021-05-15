/* global Twitch */

import { useEffect, useRef } from "react";

export default function TwitchStream({ channel, primary = false, className }) {
  const divId = primary
    ? "twitch-stream-embed-primary"
    : `twitch-stream-embed-${channel}`;

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

  return <div id={divId} className={className}></div>;
}
