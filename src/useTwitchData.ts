import { useEffect, useState } from "react";
import {
  getStreams,
  StreamData,
  checkTwitchAuth,
  getAuthedUser,
  TwitchUser,
  getFollowedStreams,
  getUsers,
} from "./twitch";

const FETCH_FOLLOWED_INTERVAL_MINS = 1;

export type FollowedStreamData = { stream: StreamData; user?: TwitchUser };

export default function useTwitchData({ streams }: { streams: string[] }): {
  streamData: Record<string, StreamData>;
  hasTwitchAuth: boolean;
  twitchUser?: TwitchUser;
  followedStreams: FollowedStreamData[];
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

  const [followedStreams, setFollowedStreams] = useState<FollowedStreamData[]>(
    []
  );
  useEffect(() => {
    if (hasTwitchAuth && twitchUser) {
      async function fetchFollowedStreams() {
        const followedResult = await getFollowedStreams({
          userId: twitchUser!.id,
        });
        const usersResult = await getUsers({
          ids: followedResult.data.map((stream) => stream.userId),
        });
        const result: FollowedStreamData[] = followedResult.data.map(
          (stream) => ({
            stream,
            user: usersResult.data.find((u) => u.id === stream.userId),
          })
        );
        setFollowedStreams(result);
      }
      fetchFollowedStreams();
      const interval = setInterval(
        fetchFollowedStreams,
        FETCH_FOLLOWED_INTERVAL_MINS * 60 * 1000
      );
      return () => clearInterval(interval);
    } else {
      setFollowedStreams([]);
    }
  }, [hasTwitchAuth, twitchUser]);

  return { streamData, hasTwitchAuth, twitchUser, followedStreams };
}
