import { useEffect, useState } from "react";
import produce from "immer";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faCaretSquareLeft,
  faCaretSquareRight,
} from "@fortawesome/free-solid-svg-icons";
import Cookies from "js-cookie";
import { usePrevious } from "react-use";
import { useQuery, useQueryClient } from "react-query";
import { difference as arrayDiff, uniq } from "lodash";

import TwitchChat from "./TwitchChat";
import useBounding from "./useBounding";
import {
  CHAT_EVICT_SEC,
  FETCH_FOLLOWED_INTERVAL_MINS,
  PROJECT_URL,
  STREAM_STATE_COOKIE,
  TWITCH_AUTH_URL,
} from "./const";
import AddStream from "./AddStream";
import {
  checkTwitchAuth,
  getAuthedUser,
  getFollowedStreams,
  handleTwitchAuthCallback,
} from "./twitch";
import useSettings from "./useSettings";
import { AppProvider } from "./appContext";
import { Sidebar } from "./Sidebar";
import { StreamContainer } from "./StreamContainer";
import { epoch } from "./utils";
import useStreams, { Layout } from "./useStreams";

const pageURL = new URL(window.location.href);
let parsedUrlStreams: string[] = [];
const urlStreams = pageURL.searchParams.get("streams");
if (urlStreams) {
  parsedUrlStreams = urlStreams.split(",");
}
let parsedUrlPrimary: string[] = [];
const urlPrimary = pageURL.searchParams.get("primary");
if (urlPrimary) {
  parsedUrlPrimary = urlPrimary.split(",");
}
let parsedUrlLayout: Layout | undefined;
const urlLayout = pageURL.searchParams.get("layout");
if (urlLayout) {
  const num = Number(urlLayout);
  parsedUrlLayout = Number.isNaN(num) ? Layout.OneUp : num;
}

let { reloadFromAuthStreams, reloadFromAuthPrimary, reloadFromAuthLayout } =
  handleTwitchAuthCallback();

const initialStreamState = {
  streams: uniq(reloadFromAuthStreams || parsedUrlStreams || []),
  primaryStreams: uniq(reloadFromAuthPrimary || parsedUrlPrimary || []),
  layout: reloadFromAuthLayout || parsedUrlLayout || Layout.OneUp,
};

export default function App() {
  const [settings, setSettings] = useSettings();
  const {
    state: streamState,
    addStream: addNewStream,
    removeStream,
    setPrimaryStream,
  } = useStreams(initialStreamState);
  const prevStreamState = usePrevious(streamState);
  const { streams, primaryStreams, layout } = streamState;

  // const [primaryStreamNames, _setPrimaryStreams] =
  //   useState<string[]>(initialPrimary);
  // const setPrimaryStream = useCallback(
  //   function setPrimaryStreamName(streamName?: string) {
  //     _setPrimaryStreams(streamName?.toLowerCase());
  //   },
  //   [_setPrimaryStreams]
  // );
  // const prevPrimaryStream = usePrevious(primaryStreamNames);

  // const removeStream = useCallback(
  //   function removeStream(index: number) {
  //     if (
  //       streams.findIndex((s) => s.toLowerCase() === primaryStreamNames) ===
  //       index
  //     ) {
  //       const newPrimary = streams[index + (index === 0 ? 1 : -1)];
  //       setPrimaryStream(newPrimary ? newPrimary : undefined);
  //     }
  //     setStreams(
  //       produce((draft) => {
  //         draft.splice(index, 1);
  //       })
  //     );
  //   },
  //   [primaryStreamNames, setPrimaryStream, streams]
  // );

  // set URL params
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    streams && streams.length
      ? params.set("streams", streams.filter(Boolean).toString())
      : params.delete("streams");
    primaryStreams && primaryStreams.length
      ? params.set("primary", primaryStreams.toString())
      : params.delete("primary");
    layout !== Layout.OneUp
      ? params.set("layout", layout.toString())
      : params.delete("layout");

    url.search = params.toString();
    window.history.replaceState({}, window.document.title, url.toString());
    setTimeout(() => {
      Cookies.set(
        STREAM_STATE_COOKIE,
        JSON.stringify({
          streams,
          primaryStreams,
        })
      );
    });
  }, [streams, primaryStreams, layout]);

  const primaryContainerRect = useBounding("primary-stream-container");

  const [loadedChats, setLoadedChats] = useState<
    Array<{
      lastOpened: number;
      channel: string;
    }>
  >(
    primaryStreams ? [{ channel: primaryStreams[0], lastOpened: epoch() }] : []
  );

  // lazy loading chats
  useEffect(() => {
    if (primaryStreams.length) {
      let primaryChatIndex, primaryChatLastOpened;
      const hasLoadedPrimary = loadedChats.some(
        ({ channel, lastOpened }, i) => {
          const isPrimary = primaryStreams.includes(channel);
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
          ...primaryStreams.map((channel) => ({
            channel,
            lastOpened: epoch(),
          })),
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

    if (prevStreamState) {
      const closedStreams = arrayDiff(
        prevStreamState.primaryStreams,
        primaryStreams
      );
      setLoadedChats(
        produce((state) => {
          closedStreams.forEach((prevPrimaryStream) => {
            const index = state.findIndex(
              ({ channel }) => channel === prevPrimaryStream
            );
            if (state[index]) {
              state[index].lastOpened = epoch();
            }
          });
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
              primaryStreams.includes(channel) ||
              lastOpened > epoch(-CHAT_EVICT_SEC)
          )
        );
      }
    }

    evictOldChats();
    const interval = setInterval(evictOldChats, 10000);
    return () => clearInterval(interval);
  }, [primaryStreams, loadedChats, setLoadedChats, streams, prevStreamState]);

  const queryClient = useQueryClient();

  const { data: twitchUser } = useQuery("authedTwitchUser", getAuthedUser, {
    enabled: checkTwitchAuth(),
  });

  const { data: followedStreams } = useQuery(
    "followedStreams",
    () => getFollowedStreams({ userId: twitchUser!.id }),
    {
      enabled: !!twitchUser,
      refetchInterval: FETCH_FOLLOWED_INTERVAL_MINS * 60 * 1000,
      onSuccess: (data) => {
        // pre-populate stream query data since these endpoints return the same datatype
        data.forEach((stream) =>
          queryClient.setQueryData(
            ["stream", stream.userLogin.toLowerCase()],
            stream
          )
        );
      },
    }
  );

  const { showChat, fullHeightPlayer } = settings;

  const [forceShowMainPane, setForceShowMainPane] = useState(false);

  //region AppReturn
  return (
    <AppProvider value={{ settings }}>
      <main
        className={classNames(
          "flex flex-col ring-white ring-opacity-60",
          fullHeightPlayer && "fullheight-player"
        )}
      >
        {!primaryStreams && !forceShowMainPane && (
          <button
            className="fixed top-4 left-4 rounded px-4 py-3 bg-gray-500"
            onClick={() => setForceShowMainPane(true)}
          >
            <FontAwesomeIcon icon={faArrowDown} />
          </button>
        )}
        <div
          className={classNames(
            "flex primary-container",
            !primaryStreams && !forceShowMainPane && "hidden"
          )}
        >
          <Sidebar
            className="flex flex-col bg-blue-800"
            settings={settings}
            setSettings={setSettings}
            followedStreams={followedStreams}
            streams={streams}
            primaryStreams={primaryStreams}
            addStream={addNewStream}
          />
          <div id="primary-stream-container" className="flex-grow h-full" />
          <div
            id="chats-container"
            className={classNames(
              "flex relative transition-all"
              // showChat ? "" : "w-0"
            )}
          >
            {loadedChats.length > 0 && (
              <div
                className={classNames(
                  "cursor-pointer opacity-40 hover:opacity-75 absolute top-2 z-10 transition-all",
                  showChat ? "left-2" : "-left-12"
                )}
                onClick={() =>
                  setSettings(({ showChat, ...state }) => ({
                    ...state,
                    showChat: !showChat,
                  }))
                }
                title={(showChat ? "Hide" : "Show") + " Chat"}
                role="button"
              >
                <FontAwesomeIcon
                  icon={showChat ? faCaretSquareRight : faCaretSquareLeft}
                  size="2x"
                />
              </div>
            )}
            {loadedChats.map(({ channel }) => (
              <TwitchChat
                key={channel}
                channel={channel}
                className={classNames(
                  channel === primaryStreams[0] && showChat
                    ? "chat-standard-width"
                    : "w-0",
                  "transition-all"
                )}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-center flex-wrap px-4 gap-4 bg-gray-900">
          <div className="w-64 flex flex-col p-3 stream-container">
            <AddStream addNewStream={addNewStream} />
          </div>
          {streams.map((stream, i) => (
            <StreamContainer
              className="h-full w-64 flex flex-col justify-center p-3 bg-black stream-container"
              key={stream}
              stream={stream}
              layout={layout}
              primaryPosition={primaryStreams.indexOf(stream)}
              primaryContainerRect={primaryContainerRect}
              setPrimaryStream={setPrimaryStream}
              remove={() => removeStream(i)}
            />
          ))}
        </div>
        <div className="mx-auto p-8 mt-16 mb-8 bg-gray-900 rounded-md text-center">
          <h1 className="text-6xl mb-2">YATMV</h1>
          <h2 className="text-lg mb-8">Yet Another Twitch Multi-View</h2>
          {!primaryStreams && (
            <p className="mx-auto mb-8 font-bold">
              Add a channel above to start.
            </p>
          )}
          <div className="explainer max-w-prose mx-auto">
            <p>
              {checkTwitchAuth() ? (
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
