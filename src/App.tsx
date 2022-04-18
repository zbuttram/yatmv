import { useEffect, useState } from "react";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faCaretSquareLeft,
  faCaretSquareRight,
} from "@fortawesome/free-solid-svg-icons";
import { Toaster } from "react-hot-toast";

import TwitchChat from "./TwitchChat";
import useBounding from "./useBounding";
import { PROJECT_URL, TWITCH_AUTH_URL } from "./const";
import AddStream from "./AddStream";
import { checkTwitchAuth } from "./twitch";
import useSettings from "./useSettings";
import { AppProvider } from "./appContext";
import { Sidebar } from "./Sidebar";
import { StreamContainer } from "./StreamContainer";
import useStreams from "./useStreams";
import { useLazyLoadingChats } from "./useLazyLoadingChats";
import useScroll from "./useScroll";
import useFollowedStreams from "./useFollowedStreams";
import useHostsMap from "./useHostsMap";
import { SettingsModal } from "./SettingsModal";
import TwitchBrowser from "./TwitchBrowser";

export default function App() {
  const [settings, setSettings] = useSettings();
  const { showChat, fullHeightPlayer } = settings;

  const {
    state: streamState,
    prevState: prevStreamState,
    actions: streamActions,
  } = useStreams();
  const { streams, primaryStreams, layout } = streamState;
  const {
    addStream: addNewStream,
    removeStream,
    setPrimaryStream,
    rotatePrimary,
    setLayout,
    replaceStream,
  } = streamActions;

  const primaryContainerRect = useBounding("primary-stream-container");
  const referenceStreamContainerRect = useBounding(
    "stream-container-reference"
  );
  const scrollY = useScroll();
  const loadedChats = useLazyLoadingChats({ streamState, prevStreamState });
  const followedStreams = useFollowedStreams({ addNewStream });

  const [forceShowMainPane, setForceShowMainPane] = useState(false);
  const showMainPane = primaryStreams.length || forceShowMainPane;
  useEffect(() => {
    if (showMainPane) {
      setForceShowMainPane(true);
    }
  }, [showMainPane]);

  const hostsMap = useHostsMap({ streams });

  const [modalOpen, setModalOpen] =
    useState<null | "settings" | "twitch-browser">(null);
  const closeModal = () => setModalOpen(null);

  //region AppReturn
  return (
    <AppProvider value={{ settings }}>
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
            showSettingsModal={() => setModalOpen("settings")}
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
            className="w-56 flex flex-col py-3 stream-container"
            style={{
              maxHeight: referenceStreamContainerRect.height
                ? referenceStreamContainerRect.height
                : undefined,
            }}
          >
            <AddStream
              addNewStream={addNewStream}
              setModalOpen={setModalOpen}
            />
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
              hostTarget={hostsMap[stream]}
              replaceStream={replaceStream}
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
      {/* Modal Container */}
      <div className="fixed top-0 z-30 w-full pointer-events-none flex justify-center pt-16">
        <SettingsModal
          isOpen={modalOpen === "settings"}
          close={() => setModalOpen(null)}
          settings={settings}
          setSettings={setSettings}
        />
        <TwitchBrowser
          isOpen={modalOpen === "twitch-browser"}
          close={closeModal}
          followedStreams={followedStreams}
          addNewStream={addNewStream}
        />
      </div>
    </AppProvider>
  );
}
