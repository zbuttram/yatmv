import { useEffect, useState } from "react";
import produce from "immer";
import { uniq, without } from "lodash";

import { StreamState } from "./useStreams";
import { epoch } from "./utils";
import { CHAT_EVICT_SEC } from "./const";

export function useLazyLoadingChats({
  streamState,
  prevStreamState,
  selectedChat,
}: {
  streamState: StreamState;
  prevStreamState: StreamState | undefined;
  selectedChat: string;
}) {
  const { streams } = streamState;
  const primaryStreams = uniq([
    ...streamState.primaryStreams.slice(),
    selectedChat,
  ]);

  const [loadedChats, setLoadedChats] = useState<
    Array<{
      lastOpened: number;
      channel: string;
    }>
  >(
    primaryStreams.length
      ? primaryStreams.map((ps) => ({ channel: ps, lastOpened: epoch() }))
      : []
  );

  // lazy loading chats
  useEffect(() => {
    if (primaryStreams.length) {
      const notLoadedPrimaries = primaryStreams.filter(
        (ps) => !loadedChats.find((ch) => ch.channel === ps)
      );

      setLoadedChats(
        produce((draft) => {
          if (notLoadedPrimaries.length) {
            draft.push(
              ...notLoadedPrimaries.map((channel) => ({
                channel,
                lastOpened: epoch(),
              }))
            );
          }
          primaryStreams.forEach((ps) => {
            const idx = loadedChats.findIndex((ch) => ch.channel === ps);
            if (draft[idx]) {
              draft[idx].lastOpened = epoch();
            }
          });
        })
      );
    }

    if (prevStreamState) {
      const closedStreams = without(
        prevStreamState.primaryStreams,
        ...primaryStreams
      );
      setLoadedChats(
        produce((state) => {
          closedStreams.forEach((prevPrimaryStream) => {
            const index = state.findIndex(
              ({ channel }) => channel === prevPrimaryStream
            );
            if (state[index]) {
              state[index].lastOpened = epoch();
            }
          });
        })
      );
    }

    const channelsToRemove: string[] = [];
    loadedChats.forEach(({ channel }) => {
      if (!streams.map((s) => s.toLowerCase()).includes(channel)) {
        channelsToRemove.push(channel);
      }
    });
    if (channelsToRemove.length) {
      setLoadedChats((state) =>
        state.filter(({ channel }) => !channelsToRemove.includes(channel))
      );
    }

    function evictOldChats() {
      if (
        loadedChats.length > 4 &&
        loadedChats.some(
          ({ lastOpened }) => lastOpened < epoch(-CHAT_EVICT_SEC)
        )
      ) {
        setLoadedChats((state) =>
          state.filter(
            ({ lastOpened, channel }) =>
              primaryStreams.includes(channel) ||
              lastOpened > epoch(-CHAT_EVICT_SEC)
          )
        );
      }
    }

    evictOldChats();
    const interval = setInterval(evictOldChats, 10000);
    return () => clearInterval(interval);
  }, [primaryStreams, loadedChats, setLoadedChats, streams, prevStreamState]);

  return loadedChats.filter(
    ({ channel }) => channel !== "" && channel !== undefined && channel !== null
  );
}
