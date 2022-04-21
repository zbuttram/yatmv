import { useRef } from "react";
import { useQuery, useQueryClient } from "react-query";
import { without } from "lodash";
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
  const { data: twitchUser } = useQuery("authedTwitchUser", getAuthedUser, {
    enabled: checkTwitchAuth(),
  });
  const prevFollowedStreams = useRef<StreamData[]>([]);
  const { data: followedStreams } = useQuery(
    "followedStreams",
    () => getFollowedStreams({ userId: twitchUser!.id }),
    {
      enabled: !!twitchUser,
      refetchInterval: FETCH_FOLLOWED_INTERVAL,
      onSuccess: (data) => {
        // pre-populate stream query data since these endpoints return the same datatype
        data.forEach((stream) =>
          queryClient.setQueryData(
            ["stream", stream.userLogin.toLowerCase()],
            stream
          )
        );

        if (prevFollowedStreams.current.length > 0) {
          const newStreams = without(
            data.map((s) => s.userName).filter(Boolean),
            ...prevFollowedStreams.current
              .map((s) => s.userName)
              .filter(Boolean)
          );
          if (newStreams.length) {
            newStreams.forEach((stream) => liveToast(stream, addNewStream));
          }
        }

        prevFollowedStreams.current = data;
      },
    }
  );

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

if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  window._liveToast = (name = "test") => liveToast(name, () => {});
}
