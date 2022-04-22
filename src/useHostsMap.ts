import { useImmer } from "use-immer";
import { useEffect, useRef } from "react";
import { without } from "lodash";

import { getChatService } from "./TwitchChatService";

export default function useHostsMap({ streams }: { streams: string[] }) {
  const [hostsMap, setHostsMap] = useImmer<Record<string, string>>({});
  const ChatService = useRef(getChatService(streams));
  useEffect(() => {
    return ChatService.current.on("hosting", ({ channel, target }) => {
      setHostsMap((draft) => {
        draft[channel.toLowerCase()] = target;
      });
    });
  }, [setHostsMap]);
  useEffect(() => {
    ChatService.current.channels = streams;
    const closedChannels = without(Object.keys(hostsMap), ...streams);
    if (closedChannels.length) {
      setHostsMap((draft) => {
        closedChannels.forEach((channel) => {
          delete draft[channel];
        });
      });
    }
  }, [streams, hostsMap, setHostsMap]);

  return hostsMap;
}