import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { without } from "lodash-es";
import { toast } from "react-hot-toast";

import {
  checkTwitchAuth,
  getAuthedUser,
  getFollowedStreams,
  StreamData,
} from "./twitch";
import { FETCH_FOLLOWED_INTERVAL } from "./const";
import LiveToast from "./LiveToast";

export default function useFollowedStreams({
  addNewStream,
}: {
  addNewStream: (name: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: twitchUser } = useQuery({
    queryKey: ["authedTwitchUser"],
    queryFn: getAuthedUser,
    enabled: checkTwitchAuth(),
  });
  const prevFollowedStreams = useRef<StreamData[]>([]);
  const { data: followedStreams, dataUpdatedAt } = useQuery({
    queryKey: ["followedStreams"],
    queryFn: () => getFollowedStreams({ userId: twitchUser!.id }),
    enabled: !!twitchUser,
    refetchInterval: FETCH_FOLLOWED_INTERVAL,
  });

  // runs after every successful fetch (replaces react-query v3's onSuccess)
  useEffect(() => {
    if (!followedStreams) return;

    // pre-populate stream query data since these endpoints return the same datatype
    followedStreams.forEach((stream) =>
      queryClient.setQueryData(
        ["stream", stream.userLogin.toLowerCase()],
        stream
      )
    );

    if (prevFollowedStreams.current.length > 0) {
      const newStreams = without(
        followedStreams.map((s) => s.userName).filter(Boolean),
        ...prevFollowedStreams.current.map((s) => s.userName).filter(Boolean)
      );
      if (newStreams.length) {
        newStreams.forEach((stream) => liveToast(stream, addNewStream));
      }
    }

    prevFollowedStreams.current = followedStreams;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUpdatedAt]);

  return followedStreams;
}

function liveToast(stream: string, add: (stream: string) => void) {
  toast.custom(
    (t) => (
      <LiveToast
        channel={stream}
        addStream={() => add(stream)}
        dismiss={() => toast.dismiss(t.id)}
        visible={t.visible}
      />
    ),
    { duration: 10000 }
  );
}

if (import.meta.env.DEV) {
  // @ts-ignore
  window._liveToast = (name = "test") => liveToast(name, () => {});
}
