import {
  useState,
  useEffect,
  useCallback,
  useRef,
  SetStateAction,
  Dispatch,
} from "react";
import produce from "immer";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitch, faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faComment,
  faCommentSlash,
  faExpand,
  faTrash,
  faArrowLeft,
  faRocket,
  faSlash,
} from "@fortawesome/free-solid-svg-icons";
import Cookies from "js-cookie";
import { usePrevious } from "react-use";

import TwitchChat from "./TwitchChat";
import TwitchStream from "./TwitchStream";
import useBounding from "./useBounding";
import { TWITCH_ACCESS_TOKEN_COOKIE } from "./const";
import AddStream from "./AddStream";
import { checkTwitchAuth, searchChannels, Stream } from "./twitch";
import useSettings, { Settings, SettingsProvider } from "./useSettings";

const PROJECT_URL = "https://github.com/zbuttram/yatmv";
const TWITCH_SCOPES = [];
const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=1sphvbcdy1eg1p9n122ptcloxvg7wm&redirect_uri=${encodeURIComponent(
  window.location.origin
)}&response_type=token&scope=${encodeURIComponent(TWITCH_SCOPES.join(" "))}`;
const STREAM_STATE_COOKIE = "yatmv-state";
const CHAT_EVICT_SEC = 60 * 15;

function streamNameToObject(streamName) {
  return { displayName: streamName };
}

function epoch(diff: number = 0) {
  return Math.floor(Date.now() / 1000) + diff;
}

const pageURL = new URL(window.location.href);
let parsedUrlStreams: Stream[] = [];
const urlStreams = pageURL.searchParams.get("streams");
if (urlStreams) {
  parsedUrlStreams = urlStreams.split(",").map(streamNameToObject);
}

const urlPrimary = pageURL.searchParams.get("primary");

let reloadFromAuthStreams: Stream[], reloadFromAuthPrimary: string;
if (document.location.hash) {
  const hashParams = new URLSearchParams(document.location.hash.slice(1));
  const accessTokenParam = hashParams.get("access_token");
  if (accessTokenParam) {
    Cookies.set(TWITCH_ACCESS_TOKEN_COOKIE, accessTokenParam, { expires: 59 });
    document.location.hash = "";
    const rawStreamState = Cookies.get(STREAM_STATE_COOKIE);
    if (rawStreamState) {
      const parsedStreamState: { streams: string[]; primary: string } =
        JSON.parse(rawStreamState);
      reloadFromAuthStreams = parsedStreamState.streams.map(streamNameToObject);
      reloadFromAuthPrimary = parsedStreamState.primary;
    }
  }
}
const hasTwitchAuth = checkTwitchAuth();

export default function App() {
  const [settings, setSettings] = useSettings();
  const [streams, setStreams] = useState<Stream[]>(
    reloadFromAuthStreams || parsedUrlStreams
  );

  const [primaryStreamName, _setPrimaryStreamName] = useState<
    string | undefined
  >(
    reloadFromAuthPrimary || urlPrimary || streams[0]?.displayName.toLowerCase()
  );
  const setPrimaryStreamName = useCallback(
    function setPrimaryStreamName(streamName?: string) {
      _setPrimaryStreamName(streamName?.toLowerCase());
    },
    [_setPrimaryStreamName]
  );
  const setPrimaryStream = useCallback(
    function setPrimaryStream(stream?: Stream) {
      setPrimaryStreamName(stream?.displayName);
    },
    [setPrimaryStreamName]
  );
  const prevPrimaryStream = usePrevious(primaryStreamName);

  const addNewStream = useCallback(
    function addNewStream(stream: Stream) {
      if (
        streams
          .map((s) => s.displayName.toLowerCase())
          .includes(stream.displayName.toLowerCase())
      ) {
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
        streams.findIndex(
          (s) => s.displayName.toLowerCase() === primaryStreamName
        ) === index
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
      ? params.set("streams", streams.map((s) => s.displayName).toString())
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
          streams: streams.map((s) => s.displayName),
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
      if (!streams.map((s) => s.displayName.toLowerCase()).includes(channel)) {
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

  const [fetchingStreamData, setFetchingStreamData] =
    useState<string | null>(null);

  // fetch channel data from Twitch
  useEffect(() => {
    if (!hasTwitchAuth || fetchingStreamData) {
      return;
    }
    let streamToFetch;
    streams.some((stream) => {
      if (!stream.hasTwitchData) {
        streamToFetch = stream;
        return true;
      } else {
        return false;
      }
    });
    if (!streamToFetch) {
      return;
    }
    setFetchingStreamData(streamToFetch.displayName);
    (async function getStreamData(streamToFetch) {
      const results = await searchChannels(streamToFetch.displayName, {
        first: 5,
      });
      const found = results.data.find(
        (res) =>
          res.displayName.toLowerCase() ===
          streamToFetch.displayName.toLowerCase()
      );
      if (found) {
        setStreams(
          produce((streams) => {
            const idxToUpdate = streams.findIndex(
              (s) => s.displayName === streamToFetch.displayName
            );
            streams[idxToUpdate] = { ...streams[idxToUpdate], ...found };
          })
        );
      }
      setFetchingStreamData(null);
    })(streamToFetch);
  }, [streams, setStreams, fetchingStreamData, setFetchingStreamData]);

  const { showChat } = settings;

  //region AppReturn
  return (
    <SettingsProvider value={settings}>
      <main className="flex flex-col ring-white ring-opacity-60">
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
          <div className="w-64 flex flex-col p-3">
            <AddStream addNewStream={addNewStream} className="my-auto" />
          </div>
          {streams.map((stream, i) => (
            <StreamContainer
              className="h-full w-64 flex flex-col justify-center p-3 bg-black stream-container"
              key={stream.displayName}
              stream={stream}
              isPrimary={stream.displayName.toLowerCase() === primaryStreamName}
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
    </SettingsProvider>
  );
}

function StreamContainer({
  stream,
  isPrimary,
  primaryContainerRect,
  remove,
  setPrimaryStream,
  className,
}: {
  stream: Stream;
  isPrimary: boolean;
  primaryContainerRect: Partial<DOMRect>;
  remove: () => void;
  setPrimaryStream: (stream: Stream) => void;
  className?: string;
}) {
  const { broadcasterLogin, displayName, hasTwitchData, title } = stream;
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
        channel={broadcasterLogin || displayName.toLowerCase()}
        primary={isPrimary}
        primaryContainerRect={primaryContainerRect}
      />
      <div className="w-full flex flex-col self-end">
        <div className="pt-2 pb-1">
          {hasTwitchData && (
            <div className="text-xs truncate" title={title}>
              {title}
            </div>
          )}
          <div className="font-bold">{displayName}</div>
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

function Sidebar({
  className,
  settings,
  setSettings,
}: {
  className?: string;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
}) {
  const { boostMode, showChat } = settings;
  const [open, setOpen] = useState(false);

  return (
    <div
      className={classNames(
        "sidebar flex flex-col",
        open ? "open w-56" : "w-16",
        className
      )}
    >
      <div className="self-end mb-2">
        <label>
          <span className="btn-txt">Collapse</span>
          <button
            className="btn-sidebar"
            onClick={() => setOpen((state) => !state)}
          >
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={classNames(
                "transition-transform",
                !open && "flip-horizontal"
              )}
              fixedWidth
            />
          </button>
        </label>
      </div>
      {!hasTwitchAuth && (
        <div>
          <label>
            <a
              className="btn-sidebar bg-black bg-purple-700"
              href={TWITCH_AUTH_URL}
            >
              <FontAwesomeIcon icon={faTwitch} fixedWidth />
            </a>
            <span className="btn-txt">Connect to Twitch</span>
          </label>
        </div>
      )}
      <div>
        <label>
          <button
            className="btn-sidebar bg-black"
            onClick={() =>
              setSettings(({ showChat, ...state }) => ({
                ...state,
                showChat: !showChat,
              }))
            }
          >
            <FontAwesomeIcon
              icon={showChat ? faCommentSlash : faComment}
              fixedWidth
            />
          </button>
          <span className="btn-txt">{showChat ? "Hide" : "Show"} Chat</span>
        </label>
      </div>
      <div>
        <label>
          <button
            className="btn-sidebar bg-black"
            onClick={() =>
              setSettings(({ boostMode, ...state }) => ({
                ...state,
                boostMode: !boostMode,
              }))
            }
          >
            <div className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faRocket} />
              {!boostMode && <FontAwesomeIcon icon={faSlash} />}
            </div>
          </button>
          <span className="btn-txt">
            {boostMode ? "Disable" : "Enable"} Boost Mode
          </span>
        </label>
      </div>
      <div className="flex-grow" />
      <div className="mb-3">
        <label>
          <a href={PROJECT_URL} target="_blank" rel="noreferrer">
            <span className="btn-sidebar bg-black">
              <FontAwesomeIcon icon={faGithub} fixedWidth />
            </span>
            <span className="btn-txt">GitHub</span>
          </a>
        </label>
      </div>
    </div>
  );
}
