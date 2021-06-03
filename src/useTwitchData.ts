import { useEffect, useState } from "react";
import { getStreams, StreamData } from "./twitch";

export default function useTwitchData({
  streams,
  hasTwitchAuth,
}: {
  streams: string[];
  hasTwitchAuth: boolean;
}): Record<string, StreamData> {
  const [fetching, setFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState<string[]>([]);

  const [data, setData] = useState<Record<string, StreamData>>({});

  useEffect(() => {
    if (!hasTwitchAuth || fetching) {
      return;
    }
    let streamsToFetch = streams.filter(
      (stream) => !hasFetched.includes(stream)
    );
    if (streamsToFetch.length) {
      setFetching(true);
      (async () => {
        const { data } = await getStreams({ userLogin: streamsToFetch });
        const byLogin = data.reduce(
          (acc, cv): Record<string, StreamData> => ({
            ...acc,
            [cv.userLogin]: cv,
          }),
          {}
        );
        setData((state) => ({ ...state, ...byLogin }));
        setHasFetched((state) => [...state, ...streamsToFetch]);
        setFetching(false);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streams, hasTwitchAuth, data, fetching]);

  return data;
}
