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
            newStreams.forEach(
              (stream) => {
                toast.custom((t) => (
                  <LiveToast
                    channel={stream}
                    addStream={() => addNewStream(stream)}
                    dismiss={() => toast.dismiss(t.id)}
                  />
                ));
              },
              { duration: 10000 }
            );
          }
        }

        prevFollowedStreams.current = data;
      },
    }
  );

  return followedStreams;
}
