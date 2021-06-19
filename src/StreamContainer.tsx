import { useCallback, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faTrash } from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";
import { useQuery } from "react-query";

import { FETCH_OPEN_STREAMS_INTERVAL_MINS } from "./const";
import { checkTwitchAuth, getStream } from "./twitch";
import TwitchStream from "./TwitchStream";

export function StreamContainer({
  stream,
  isPrimary,
  primaryContainerRect,
  remove,
  setPrimaryStream,
  className,
}: {
  stream: string;
  isPrimary: boolean;
  primaryContainerRect: Partial<DOMRect>;
  remove: () => void;
  setPrimaryStream: (stream: string) => void;
  className?: string;
}) {
  const { data: streamData } = useQuery(
    ["stream", stream.toLowerCase()],
    ({ queryKey: [_key, userLogin] }) => getStream({ userLogin }),
    {
      enabled: checkTwitchAuth(),
      refetchInterval: FETCH_OPEN_STREAMS_INTERVAL_MINS * 60 * 1000,
    }
  );
  const { title, userName } = streamData ?? {};

  const [isRemoving, setIsRemoving] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>();

  const onClickRemove = useCallback(
    function onClickRemove() {
      if (!isRemoving) {
        setIsRemoving(true);
        timeout.current = setTimeout(() => {
          setIsRemoving(false);
        }, 1500);
      } else {
        timeout.current && clearTimeout(timeout.current);
        remove();
      }
    },
    [remove, isRemoving, setIsRemoving]
  );

  return (
    <div className={className}>
      <TwitchStream
        channel={stream.toLowerCase()}
        primary={isPrimary}
        primaryContainerRect={primaryContainerRect}
      />
      <div className="w-full flex flex-col self-end">
        <div className="pt-2 pb-1">
          {streamData && (
            <div className="text-xs truncate" title={title}>
              {title}
            </div>
          )}
          <div className="font-bold">{userName ?? stream}</div>
        </div>
        <div className="flex">
          {!isPrimary && (
            <button
              className="btn mr-2 w-full text-black bg-green-400"
              onClick={() => setPrimaryStream(stream)}
            >
              <FontAwesomeIcon icon={faExpand} />
            </button>
          )}
          <button
            className={classNames("btn w-full", isRemoving && "bg-red-500")}
            onClick={onClickRemove}
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>
    </div>
  );
}
