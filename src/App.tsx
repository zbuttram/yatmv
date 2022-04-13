import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faCaretSquareLeft,
  faCaretSquareRight,
} from "@fortawesome/free-solid-svg-icons";
import Cookies from "js-cookie";
import { useQuery, useQueryClient } from "react-query";
import { difference, uniq } from "lodash";
import { useImmer } from "use-immer";
import { toast, Toaster } from "react-hot-toast";

import TwitchChat from "./TwitchChat";
import useBounding from "./useBounding";
import {
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
  StreamData,
} from "./twitch";
import useSettings from "./useSettings";
import { AppProvider } from "./appContext";
import { Sidebar } from "./Sidebar";
import { StreamContainer } from "./StreamContainer";
import useStreams from "./useStreams";
import { useLazyLoadingChats } from "./useLazyLoadingChats";
import { Layout } from "./layout";
import useScroll from "./useScroll";
import { TwitchChatService } from "./TwitchChatService";
import LiveToast from "./LiveToast";

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
  parsedUrlLayout = Number.isNaN(num) ? 0 : num;
}

let { reloadFromAuthStreams, reloadFromAuthPrimary, reloadFromAuthLayout } =
  handleTwitchAuthCallback();

const initialStreamState = {
  streams: uniq(reloadFromAuthStreams || parsedUrlStreams || []),
  primaryStreams: uniq(reloadFromAuthPrimary || parsedUrlPrimary || []),
  layout: reloadFromAuthLayout || parsedUrlLayout || 0,
};

const ChatService = new TwitchChatService(initialStreamState.streams.slice());

export default function App() {
  const [settings, setSettings] = useSettings();
  const {
    state: streamState,
    prevState: prevStreamState,
    actions: streamActions,
  } = useStreams(initialStreamState);
  const { streams, primaryStreams, layout } = streamState;
  const {
    addStream: addNewStream,
    removeStream,
    setPrimaryStream,
    rotatePrimary,
    setLayout,
    replaceStream,
  } = streamActions;

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
    layout !== 0
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
  const referenceStreamContainerRect = useBounding(
    "stream-container-reference"
  );
  const scrollY = useScroll();

  const loadedChats = useLazyLoadingChats({ streamState, prevStreamState });

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
      refetchInterval: FETCH_FOLLOWED_INTERVAL_MINS * 60 * 1000,
      onSuccess: (data) => {
        // pre-populate stream query data since these endpoints return the same datatype
        data.forEach((stream) =>
          queryClient.setQueryData(
            ["stream", stream.userLogin.toLowerCase()],
            stream
          )
        );

        if (prevFollowedStreams.current.length > 0) {
          const newStreams = difference(
            prevFollowedStreams.current.map((s) => s.userName),
            data.map((s) => s.userName)
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

  const { showChat, fullHeightPlayer } = settings;

  const [forceShowMainPane, setForceShowMainPane] = useState(false);
  const showMainPane = primaryStreams.length || forceShowMainPane;
  useEffect(() => {
    if (showMainPane) {
      setForceShowMainPane(true);
    }
  }, [showMainPane]);

  const [hostsMap, setHostsMap] = useImmer<Record<string, string>>({});
  useEffect(() => {
    return ChatService.on("hosting", ({ channel, target }) => {
      setHostsMap((draft) => {
        draft[channel] = target;
      });
    });
  }, [setHostsMap]);
  useEffect(() => {
    ChatService.channels = streams;
    const closedChannels = difference(streams, Object.keys(hostsMap));
    if (closedChannels.length) {
      setHostsMap((draft) => {
        closedChannels.forEach((channel) => {
          delete draft[channel];
        });
      });
    }
  }, [streams, hostsMap, setHostsMap]);

  //region AppReturn
  return (
    <AppProvider value={{ settings, chatService: ChatService }}>
      <Toaster />
      <main id="main" className="flex flex-col ring-white ring-opacity-60">
        {!showMainPane && (
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
            !showMainPane && "hidden"
          )}
          style={{
            height: `calc(100vh - ${
              fullHeightPlayer
                ? "0px"
                : referenceStreamContainerRect.height
                ? referenceStreamContainerRect.height + "px"
                : "20vh"
            })`,
          }}
        >
          <Sidebar
            className="flex flex-col bg-blue-800"
            settings={settings}
            setSettings={setSettings}
            followedStreams={followedStreams}
            streams={streams}
            primaryStreams={primaryStreams}
            addStream={addNewStream}
            setLayout={setLayout}
            rotatePrimary={rotatePrimary}
          />
          <div
            id="primary-stream-container"
            className="flex-grow self-end"
            style={{ height: scrollY ? `calc(100% - ${scrollY}px)` : "100%" }}
          />
          <div id="chats-container" className="flex relative transition-all">
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
                replaceStream={replaceStream}
                hostTarget={hostsMap[channel]}
                isDisplayed={channel === primaryStreams[0] && showChat}
              />
            ))}
          </div>
        </div>
        <div
          id="streams-outer-container"
          className="flex justify-center flex-wrap px-2 gap-1 bg-slate-900"
        >
          <div
            className="w-52 flex flex-col py-3 stream-container"
            style={{
              maxHeight: referenceStreamContainerRect.height
                ? referenceStreamContainerRect.height
                : undefined,
            }}
          >
            <AddStream addNewStream={addNewStream} />
          </div>
          {streams.map((stream, i) => (
            <StreamContainer
              id={i === 0 ? "stream-container-reference" : undefined}
              className="h-full w-64 flex flex-col justify-center py-3 px-1 bg-black stream-container"
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
