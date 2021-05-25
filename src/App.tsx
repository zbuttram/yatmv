import { useState, useEffect, useMemo, useCallback } from "react";
import produce from "immer";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitch } from "@fortawesome/free-brands-svg-icons";
import {
  faComment,
  faCommentSlash,
  faExpand,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Cookies from "js-cookie";

import TwitchChat from "./TwitchChat";
import TwitchStream from "./TwitchStream";
import useBounding from "./useBounding";
import events, { GLOBAL_RECALC_BOUNDING } from "./events";
import { TWITCH_ACCESS_TOKEN_COOKIE } from "./const";
import AddStream from "./AddStream";
import { checkTwitchAuth, searchChannels, Stream } from "./twitch";

const TWITCH_SCOPES = [];
const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=1sphvbcdy1eg1p9n122ptcloxvg7wm&redirect_uri=${encodeURIComponent(
  window.location.origin
)}&response_type=token&scope=${encodeURIComponent(TWITCH_SCOPES.join(" "))}`;
const STREAM_STATE_COOKIE = "yatmv-state";

function streamNameToObject(streamName) {
  return { displayName: streamName };
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

export default function App() {
  const [showChat, setShowChat] = useState(true);
  const [streams, setStreams] = useState<Stream[]>(
    reloadFromAuthStreams || parsedUrlStreams
  );
  const [primaryStreamName, setPrimaryStreamName] = useState<
    string | undefined
  >(reloadFromAuthPrimary || urlPrimary || streams[0]?.displayName);
  const hasTwitchAuth = useMemo(() => checkTwitchAuth(), []);

  const setPrimaryStream = useCallback(function setPrimaryStream(
    stream: Stream
  ) {
    setPrimaryStreamName(stream.displayName.toLowerCase());
  },
  []);

  const addNewStream = useCallback(
    function addNewStream(stream: Stream) {
      if (streams.map((s) => s.displayName).includes(stream.displayName)) {
        setPrimaryStream(stream);
      } else {
        if (streams.length < 1) {
          setPrimaryStream(stream);
        }
        setStreams((s) => [...s, stream]);
      }
    },
    [setPrimaryStream, streams]
  );

  const removeStream = useCallback(
    function removeStream(index: number) {
      if (
        streams.findIndex(
          (s) =>
            s.displayName.toLowerCase() === primaryStreamName?.toLowerCase()
        ) === index
      ) {
        setPrimaryStream(streams[index + (index === 0 ? 1 : -1)]);
      }
      setStreams(
        produce((draft) => {
          draft.splice(index, 1);
        })
      );
      events.emit(GLOBAL_RECALC_BOUNDING);
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

  const [loadedChats, setLoadedChats] = useState(
    primaryStreamName ? [primaryStreamName.toLowerCase()] : []
  );

  // lazy loading chats
  useEffect(() => {
    let chatToAdd,
      chatsToRemove: string[] = [];
    loadedChats.forEach((chat) => {
      if (!streams.map((s) => s.displayName.toLowerCase()).includes(chat)) {
        chatsToRemove.push(chat);
      }
    });
    if (
      primaryStreamName &&
      !loadedChats.includes(primaryStreamName.toLowerCase())
    ) {
      chatToAdd = primaryStreamName.toLowerCase();
    }
    if (chatToAdd || chatsToRemove) {
      setLoadedChats(
        produce((chats) => {
          if (chatToAdd) {
            chats.push(chatToAdd);
          }
          chatsToRemove.forEach((chat) => chats.splice(chats.indexOf(chat), 1));
          if (chats.length > 4) {
            chats.shift();
          }
        })
      );
    }
  }, [primaryStreamName, loadedChats, setLoadedChats, streams]);

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
  }, [
    streams,
    setStreams,
    fetchingStreamData,
    setFetchingStreamData,
    hasTwitchAuth,
  ]);

  return (
    <>
      <main className="pb-3 h-screen">
        <div
          className={classNames(
            "flex pb-4 h-4/5",
            !primaryStreamName && "hidden"
          )}
        >
          <div id="primary-stream-container" className="flex-grow h-full" />
          {loadedChats.map((s) => (
            <TwitchChat
              key={s}
              channel={s}
              className={classNames(
                showChat && s.toLowerCase() === primaryStreamName
                  ? "w-1/5"
                  : "w-0",
                "transition-all"
              )}
            />
          ))}
        </div>
        <div className="h-1/5 mx-auto flex">
          {streams.map((stream, i) => (
            <StreamContainer
              key={stream.displayName}
              stream={stream}
              isPrimary={stream.displayName.toLowerCase() === primaryStreamName}
              primaryContainerRect={primaryContainerRect}
              setPrimaryStream={setPrimaryStream}
              remove={() => removeStream(i)}
            />
          ))}
          <div className="my-auto w-48 flex flex-col">
            <AddStream addNewStream={addNewStream} />
          </div>
          <div className="flex flex-col ml-auto">
            {!hasTwitchAuth && (
              <a
                className="mx-4 my-2 bg-purple-700 border px-2 py-1"
                href={TWITCH_AUTH_URL}
              >
                <FontAwesomeIcon icon={faTwitch} fixedWidth />
              </a>
            )}
            {primaryStreamName && (
              <button
                className={classNames("mx-4 my-2 border px-2 py-1")}
                onClick={() => setShowChat((state) => !state)}
              >
                {showChat ? (
                  <FontAwesomeIcon icon={faCommentSlash} fixedWidth />
                ) : (
                  <FontAwesomeIcon icon={faComment} fixedWidth />
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function StreamContainer({
  stream,
  isPrimary,
  primaryContainerRect,
  remove,
  setPrimaryStream,
}: {
  stream: Stream;
  isPrimary: boolean;
  primaryContainerRect: Partial<DOMRect>;
  remove: () => void;
  setPrimaryStream: (stream: Stream) => void;
}) {
  const { broadcasterLogin, displayName, hasTwitchData, title } = stream;
  const [isRemoving, setIsRemoving] = useState(false);

  const onClickRemove = useCallback(
    function onClickRemove() {
      let timeout: ReturnType<typeof setTimeout>;
      if (!isRemoving) {
        setIsRemoving(true);
        timeout = setTimeout(() => {
          setIsRemoving(false);
        }, 1500);
      } else {
        // @ts-ignore
        clearTimeout(timeout);
        remove();
      }
    },
    [remove, isRemoving, setIsRemoving]
  );

  return (
    <div key={displayName} className="w-48 h-full mx-4 flex flex-col">
      <TwitchStream
        channel={broadcasterLogin || displayName.toLowerCase()}
        primary={isPrimary}
        primaryContainerRect={primaryContainerRect}
      />
      {hasTwitchData && (
        <div className="text-xs truncate" title={title}>
          {title}
        </div>
      )}
      <div className="text-sm">{displayName}</div>
      <div className="flex">
        {!isPrimary && (
          <button
            className={"px-1 mr-2 border w-full text-black bg-green-400"}
            onClick={() => setPrimaryStream(stream)}
          >
            <FontAwesomeIcon icon={faExpand} />
          </button>
        )}
        <button
          className={classNames(
            "px-1 border w-full",
            isRemoving && "bg-red-500"
          )}
          onClick={onClickRemove}
        >
          <FontAwesomeIcon icon={faTrash} />
        </button>
      </div>
    </div>
  );
}
