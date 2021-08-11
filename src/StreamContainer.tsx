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
import { Layout } from "./useStreams";
import { range } from "lodash";

export function StreamContainer({
  stream,
  primaryPosition,
  primaryContainerRect,
  remove,
  setPrimaryStream,
  layout,
  className,
}: {
  stream: string;
  primaryPosition: number;
  primaryContainerRect: Partial<DOMRect>;
  remove: () => void;
  setPrimaryStream: (stream: string, position: number) => void;
  layout: Layout;
  className?: string;
}) {
  const isPrimary = primaryPosition > -1;

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
        primaryPosition={primaryPosition}
        primaryContainerRect={primaryContainerRect}
        reloadCounter={reloadCounter}
        layout={layout}
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
          {layout === Layout.OneUp && !isPrimary ? (
            <button
              className="btn mr-2 w-full text-black bg-green-400"
              onClick={() => setPrimaryStream(stream, 0)}
            >
              <FontAwesomeIcon icon={faExpand} />
            </button>
          ) : (
            range(0, layout + 1).map((pos) => (
              <button
                key={pos}
                className={classNames(
                  "btn mr-2 w-full text-black font-bold",
                  pos === primaryPosition ? "bg-red-800" : "bg-green-400"
                )}
                disabled={pos === primaryPosition}
                onClick={() => setPrimaryStream(stream, pos)}
              >
                {pos + 1}
              </button>
            ))
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
// <button
//     className="btn mr-2 w-full text-black bg-green-400"
//     onClick={() => setPrimaryStream(stream, 1)}
// >
//   <FontAwesomeIcon icon={faExpand} />
// </button>
