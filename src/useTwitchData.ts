import { useEffect, useState } from "react";
import {
  getStreams,
  StreamData,
  checkTwitchAuth,
  getAuthedUser,
  TwitchUser,
} from "./twitch";

export default function useTwitchData({ streams }: { streams: string[] }): {
  streamData: Record<string, StreamData>;
  hasTwitchAuth: boolean;
  twitchUser?: TwitchUser;
} {
  const [hasTwitchAuth, setHasTwitchAuth] = useState(false);
  const [twitchUser, setTwitchUser] = useState<TwitchUser>();
  useEffect(() => {
    if (checkTwitchAuth()) {
      (async () => {
        const user = await getAuthedUser();
        setTwitchUser(user);
        setHasTwitchAuth(true);
      })();
    }
  }, []);

  const [fetchingStreams, setFetchingStreams] = useState(false);
  const [fetchedStreams, setFetchedStreams] = useState<string[]>([]);
  const [streamData, setStreamData] = useState<Record<string, StreamData>>({});

  // fetch stream data
  useEffect(() => {
    if (!hasTwitchAuth || fetchingStreams) {
      return;
    }
    let streamsToFetch = streams.filter(
      (stream) => !fetchedStreams.includes(stream)
    );
    if (streamsToFetch.length) {
      setFetchingStreams(true);
      (async () => {
        const { data } = await getStreams({ userLogin: streamsToFetch });
        const byLogin = data.reduce(
          (acc, cv): Record<string, StreamData> => ({
            ...acc,
            [cv.userLogin]: cv,
          }),
          {}
        );
        setStreamData((state) => ({ ...state, ...byLogin }));
        setFetchedStreams((state) => [...state, ...streamsToFetch]);
        setFetchingStreams(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, hasTwitchAuth, streamData, fetchingStreams]);

  return { streamData, hasTwitchAuth, twitchUser };
}
