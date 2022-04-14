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
import { range } from "lodash";
import { Layout } from "./layout";
import { simplifyViewerCount } from "./utils";

export function StreamContainer({
  id,
  stream,
  primaryPosition,
  primaryContainerRect,
  remove,
  setPrimaryStream,
  layout,
  className,
  hostTarget,
  replaceStream,
}: {
  id?: string;
  stream: string;
  primaryPosition: number;
  primaryContainerRect: Partial<DOMRect>;
  remove: () => void;
  setPrimaryStream: (stream: string, position: number) => void;
  layout: Layout;
  className?: string;
  hostTarget?: string;
  replaceStream: (replace: string, replacement: string) => void;
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
  const { title, userName, viewerCount } = streamData ?? {};

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
    <div className={className} id={id}>
      <TwitchStream
        className="pt-4"
        channel={stream.toLowerCase()}
        primaryPosition={primaryPosition}
        primaryContainerRect={primaryContainerRect}
        reloadCounter={reloadCounter}
        layout={layout}
        overlay={
          <StreamOverlay
            isPrimary={isPrimary}
            hostTarget={hostTarget}
            replaceStream={replaceStream}
            stream={stream}
          />
        }
      />
      <div className="w-full flex flex-col px-1">
        <div className="pt-3 pb-1">
          <div className="flex">
            <div className="font-bold">{userName ?? stream}</div>
            <div className="flex-grow" />
            {!!viewerCount && !streamOffline && (
              <div className="text-sm text-right my-auto mr-1 text-red-400 whitespace-nowrap">
                {simplifyViewerCount(viewerCount)}
              </div>
            )}
            <div
              className="text-sm my-auto cursor-pointer"
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
          {checkTwitchAuth() && (
            <div
              className={classNames(
                "text-xs truncate",
                !streamData && "invisible"
              )}
              title={streamData ? title : undefined}
            >
              {streamData ? title : "N/A"}
            </div>
          )}
        </div>
        <div className="flex">
          {layout === 0 ? (
            <button
              className={classNames(
                "btn mr-2 w-full",
                isPrimary
                  ? "bg-red-800 cursor-not-allowed text-white"
                  : "bg-green-400 text-black"
              )}
              onClick={() => setPrimaryStream(stream, 0)}
              disabled={isPrimary}
            >
              <FontAwesomeIcon icon={faExpand} />
            </button>
          ) : (
            range(0, layout + 1).map((pos) => (
              <button
                key={pos}
                className={classNames(
                  "btn mr-2 w-full text-black font-bold",
                  pos === primaryPosition
                    ? "bg-red-800 cursor-not-allowed"
                    : "bg-green-400"
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

function StreamOverlay({
  isPrimary,
  hostTarget,
  replaceStream,
  stream,
}: {
  isPrimary: boolean;
  hostTarget?: string;
  replaceStream: (replace: string, replacement: string) => void;
  stream: string;
}) {
  if (isPrimary || !hostTarget) {
    return null;
  }

  return (
    <div className="w-full h-full flex justify-center items-center bg-black pointer-events-auto">
      <p>
        Hosted{" "}
        <button
          className="underline font-semibold"
          onClick={() => replaceStream(stream, hostTarget)}
        >
          {hostTarget}
        </button>
      </p>
    </div>
  );
}
