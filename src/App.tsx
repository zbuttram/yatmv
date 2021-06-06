import { useCallback, useEffect, useRef, useState } from "react";
import produce from "immer";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExpand, faTrash } from "@fortawesome/free-solid-svg-icons";
import Cookies from "js-cookie";
import { usePrevious } from "react-use";

import TwitchChat from "./TwitchChat";
import TwitchStream from "./TwitchStream";
import useBounding from "./useBounding";
import { PROJECT_URL, STREAM_STATE_COOKIE, TWITCH_AUTH_URL } from "./const";
import AddStream from "./AddStream";
import { handleTwitchAuthCallback, StreamData } from "./twitch";
import useSettings from "./useSettings";
import useTwitchData from "./useTwitchData";
import { AppProvider } from "./appContext";
import { Sidebar } from "./Sidebar";

const CHAT_EVICT_SEC = 60 * 15;

function epoch(diff: number = 0) {
  return Math.floor(Date.now() / 1000) + diff;
}

const pageURL = new URL(window.location.href);
let parsedUrlStreams: string[] = [];
const urlStreams = pageURL.searchParams.get("streams");
if (urlStreams) {
  parsedUrlStreams = urlStreams.split(",");
}
const urlPrimary = pageURL.searchParams.get("primary");

let { reloadFromAuthStreams, reloadFromAuthPrimary } =
  handleTwitchAuthCallback();

export default function App() {
  const [settings, setSettings] = useSettings();
  const [streams, setStreams] = useState<string[]>(
    reloadFromAuthStreams || parsedUrlStreams
  );

  const [primaryStreamName, _setPrimaryStream] = useState<string | undefined>(
    reloadFromAuthPrimary || urlPrimary || streams[0]?.toLowerCase()
  );
  const setPrimaryStream = useCallback(
    function setPrimaryStreamName(streamName?: string) {
      _setPrimaryStream(streamName?.toLowerCase());
    },
    [_setPrimaryStream]
  );
  const prevPrimaryStream = usePrevious(primaryStreamName);

  const addNewStream = useCallback(
    function addNewStream(stream: string) {
      if (streams.map((s) => s.toLowerCase()).includes(stream.toLowerCase())) {
        setPrimaryStream(stream);
      } else {
        if (streams.length < 1) {
          setPrimaryStream(stream);
        }
        setStreams((s) => [stream, ...s]);
      }
    },
    [setPrimaryStream, streams]
  );

  const removeStream = useCallback(
    function removeStream(index: number) {
      if (
        streams.findIndex((s) => s.toLowerCase() === primaryStreamName) ===
        index
      ) {
        const newPrimary = streams[index + (index === 0 ? 1 : -1)];
        setPrimaryStream(newPrimary ? newPrimary : undefined);
      }
      setStreams(
        produce((draft) => {
          draft.splice(index, 1);
        })
      );
    },
    [primaryStreamName, setPrimaryStream, streams]
  );

  // set URL params
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    streams
      ? params.set("streams", streams.toString())
      : params.delete("streams");
    primaryStreamName
      ? params.set("primary", primaryStreamName)
      : params.delete("primary");

    url.search = params.toString();
    window.history.replaceState({}, window.document.title, url.toString());
    setTimeout(() => {
      Cookies.set(
        STREAM_STATE_COOKIE,
        JSON.stringify({
          streams: streams,
          primaryStream: primaryStreamName,
        })
      );
    });
  }, [streams, primaryStreamName]);

  const primaryContainerRect = useBounding("primary-stream-container");

  const [loadedChats, setLoadedChats] = useState<
    Array<{
      lastOpened: number;
      channel: string;
    }>
  >(
    primaryStreamName
      ? [{ channel: primaryStreamName, lastOpened: epoch() }]
      : []
  );

  // lazy loading chats
  useEffect(() => {
    if (primaryStreamName) {
      let primaryChatIndex, primaryChatLastOpened;
      const hasLoadedPrimary = loadedChats.some(
        ({ channel, lastOpened }, i) => {
          const isPrimary = channel === primaryStreamName;
          if (isPrimary) {
            primaryChatIndex = i;
            primaryChatLastOpened = lastOpened;
            return true;
          } else {
            return false;
          }
        }
      );

      if (!hasLoadedPrimary) {
        setLoadedChats((state) => [
          ...state,
          { channel: primaryStreamName, lastOpened: epoch() },
        ]);
      } else {
        const now = epoch();
        if (primaryChatLastOpened <= now - 1) {
          setLoadedChats(
            produce((state) => {
              state[primaryChatIndex].lastOpened = epoch();
            })
          );
        }
      }
    }

    if (prevPrimaryStream) {
      setLoadedChats(
        produce((state) => {
          state[
            state.findIndex(({ channel }) => channel === prevPrimaryStream)
          ].lastOpened = epoch();
        })
      );
    }

    const channelsToRemove: string[] = [];
    loadedChats.forEach(({ channel }) => {
      if (!streams.map((s) => s.toLowerCase()).includes(channel)) {
        channelsToRemove.push(channel);
      }
    });
    if (channelsToRemove.length) {
      setLoadedChats((state) =>
        state.filter(({ channel }) => !channelsToRemove.includes(channel))
      );
    }

    function evictOldChats() {
      if (
        loadedChats.length > 4 &&
        loadedChats.some(
          ({ lastOpened }) => lastOpened < epoch(-CHAT_EVICT_SEC)
        )
      ) {
        setLoadedChats((state) =>
          state.filter(
            ({ lastOpened, channel }) =>
              channel === primaryStreamName ||
              lastOpened > epoch(-CHAT_EVICT_SEC)
          )
        );
      }
    }

    evictOldChats();
    const interval = setInterval(evictOldChats, 10000);
    return () => clearInterval(interval);
  }, [
    primaryStreamName,
    loadedChats,
    setLoadedChats,
    streams,
    prevPrimaryStream,
  ]);

  const { streamData, hasTwitchAuth, followedStreams } = useTwitchData({
    streams,
  });

  const { showChat, fullHeightPlayer } = settings;

  //region AppReturn
  return (
    <AppProvider value={{ settings, hasTwitchAuth }}>
      <main
        className={classNames(
          "flex flex-col ring-white ring-opacity-60",
          fullHeightPlayer && "fullheight-player"
        )}
      >
        <div
          className={classNames(
            "flex primary-container",
            !primaryStreamName && "hidden"
          )}
        >
          <Sidebar
            className="flex flex-col bg-blue-800"
            settings={settings}
            setSettings={setSettings}
            hasTwitchAuth={hasTwitchAuth}
            followedStreams={followedStreams}
            streams={streams}
            primaryStream={primaryStreamName}
            addStream={addNewStream}
          />
          <div id="primary-stream-container" className="flex-grow h-full" />
          {loadedChats.map(({ channel }) => (
            <TwitchChat
              key={channel}
              channel={channel}
              className={classNames(
                showChat && channel === primaryStreamName ? "w-1/5" : "w-0",
                "transition-all"
              )}
            />
          ))}
        </div>
        <div className="flex justify-center flex-wrap px-4 gap-4 bg-gray-900">
          <div className="w-64 flex flex-col p-3 stream-container">
            <AddStream addNewStream={addNewStream} className="my-auto" />
          </div>
          {streams.map((stream, i) => (
            <StreamContainer
              className="h-full w-64 flex flex-col justify-center p-3 bg-black stream-container"
              key={stream}
              stream={stream}
              streamData={streamData[stream.toLowerCase()]}
              isPrimary={stream.toLowerCase() === primaryStreamName}
              primaryContainerRect={primaryContainerRect}
              setPrimaryStream={setPrimaryStream}
              remove={() => removeStream(i)}
            />
          ))}
        </div>
        <div className="mx-auto p-8 mt-16 mb-8 bg-gray-900 rounded-md text-center">
          <h1 className="text-6xl mb-2">YATMV</h1>
          <h2 className="text-lg mb-8">Yet Another Twitch Multi-View</h2>
          {!primaryStreamName && (
            <p className="mx-auto mb-8 font-bold">
              Add a channel above to start.
            </p>
          )}
          <div className="explainer max-w-prose mx-auto">
            <p>
              {hasTwitchAuth ? (
                "Connect to Twitch"
              ) : (
                <a href={TWITCH_AUTH_URL} className="underline">
                  Connect to Twitch
                </a>
              )}{" "}
              to enable additional features like live channel searching and
              stream titles! Your open channels will be saved.
            </p>
            <p>
              YATMV is open-source! Check us out on{" "}
              <a
                href={PROJECT_URL}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </AppProvider>
  );
}

function StreamContainer({
  stream,
  streamData,
  isPrimary,
  primaryContainerRect,
  remove,
  setPrimaryStream,
  className,
}: {
  stream: string;
  streamData?: StreamData;
  isPrimary: boolean;
  primaryContainerRect: Partial<DOMRect>;
  remove: () => void;
  setPrimaryStream: (stream: string) => void;
  className?: string;
}) {
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
