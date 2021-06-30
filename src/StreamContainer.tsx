import { useCallback, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircle,
  faExpand,
  faRedoAlt,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
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
  const {
    data: streamData,
    failureCount: streamFetchFailCount,
    refetch: refetchStreamData,
  } = useQuery(
    ["stream", stream.toLowerCase()],
    ({ queryKey: [_key, userLogin] }) => getStream({ userLogin }),
    {
      enabled: checkTwitchAuth(),
      refetchInterval: FETCH_OPEN_STREAMS_INTERVAL_MINS * 60 * 1000,
      retry: true,
    }
  );
  const streamOffline = streamFetchFailCount > 1;
  const { title, userName } = streamData ?? {};

  const [isRemoving, setIsRemoving] = useState(false);
  const removeConfirmTimeout =
    useRef<ReturnType<typeof setTimeout> | undefined>();
  const onClickRemove = useCallback(
    function onClickRemove() {
      if (!isRemoving) {
        setIsRemoving(true);
        removeConfirmTimeout.current = setTimeout(() => {
          setIsRemoving(false);
        }, 1500);
      } else {
        removeConfirmTimeout.current &&
          clearTimeout(removeConfirmTimeout.current);
        remove();
      }
    },
    [remove, isRemoving, setIsRemoving]
  );

  const [reloadCounter, setReloadCounter] = useState(0);
  const [hovering, setHovering] = useState(false);

  const reload = useCallback(
    function reload() {
      setReloadCounter((count) => count + 1);
      refetchStreamData();
    },
    [refetchStreamData]
  );

  return (
    <div className={className}>
      <TwitchStream
        channel={stream.toLowerCase()}
        primary={isPrimary}
        primaryContainerRect={primaryContainerRect}
        reloadCounter={reloadCounter}
      />
      <div className="w-full flex flex-col self-end">
        <div className="pt-2 pb-1">
          <div className="flex">
            <div className="font-bold">{userName ?? stream}</div>
            <div
              className="ml-auto text-sm my-auto cursor-pointer"
              onClick={reload}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              {checkTwitchAuth() ? (
                <FontAwesomeIcon
                  className={streamOffline ? "text-gray-700" : "text-red-500"}
                  icon={hovering ? faRedoAlt : faCircle}
                />
              ) : (
                <FontAwesomeIcon icon={faRedoAlt} />
              )}
            </div>
          </div>
          {streamData && (
            <div className="text-xs truncate" title={title}>
              {title}
            </div>
          )}
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
