import { useState, useEffect, useMemo } from "react";
import produce from "immer";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitch } from "@fortawesome/free-brands-svg-icons";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";
import Cookies from "js-cookie";

import TwitchChat from "./TwitchChat";
import TwitchStream from "./TwitchStream";
import useBounding from "./useBounding";
import events, { GLOBAL_RECALC_BOUNDING } from "./events";
import { TWITCH_ACCESS_TOKEN_COOKIE } from "./const";
import AddStream from "./AddStream";
import { checkTwitchAuth, Stream } from "./twitch";

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
    Cookies.set(TWITCH_ACCESS_TOKEN_COOKIE, accessTokenParam);
    document.location.hash = "";
    const rawStreamState = Cookies.get(STREAM_STATE_COOKIE);
    if (rawStreamState) {
      const parsedStreamState: { streams: string[]; primaryStream: string } =
        JSON.parse(rawStreamState);
      reloadFromAuthStreams = parsedStreamState.streams.map(streamNameToObject);
      reloadFromAuthPrimary = parsedStreamState.primaryStream;
    }
  }
}

const TWITCH_SCOPES = [];
const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=1sphvbcdy1eg1p9n122ptcloxvg7wm&redirect_uri=${encodeURIComponent(
  window.location.origin
)}&response_type=token&scope=${encodeURIComponent(TWITCH_SCOPES.join(" "))}`;

export default function App() {
  const [showChat, setShowChat] = useState(true);
  const [streams, setStreams] = useState<Stream[]>(
    reloadFromAuthStreams || parsedUrlStreams
  );
  const [primaryStreamName, setPrimaryStreamName] = useState<Lowercase<string>>(
    reloadFromAuthPrimary || urlPrimary || streams[0]?.displayName
  );
  const hasTwitchAuth = useMemo(() => checkTwitchAuth(), []);

  function setPrimaryStream(stream) {
    setPrimaryStreamName(stream.displayName.toLowerCase());
  }

  function addNewStream(stream: Stream) {
    if (streams.map((s) => s.displayName).includes(stream.displayName)) {
      setPrimaryStream(stream);
    } else {
      if (streams.length < 1) {
        setPrimaryStream(stream);
      }
      setStreams((s) => [...s, stream]);
    }
  }

  function removeStream(index) {
    if (
      streams.find(
        (s) => s.displayName.toLowerCase() === primaryStreamName.toLowerCase()
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
  }

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
        JSON.stringify({ streams, primaryStream: primaryStreamName })
      );
    });
  }, [streams, primaryStreamName]);

  const primaryContainerRect = useBounding("primary-stream-container");

  const [loadedChats, setLoadedChats] = useState(
    primaryStreamName ? [primaryStreamName] : []
  );

  useEffect(() => {
    let chatToAdd,
      chatsToRemove: string[] = [];
    loadedChats.forEach((chat) => {
      if (!streams.map((s) => s.displayName.toLowerCase()).includes(chat)) {
        chatsToRemove.push(chat);
      }
    });
    if (!loadedChats.includes(primaryStreamName)) {
      chatToAdd = primaryStreamName;
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
          {streams.map((s, i) => {
            const isPrimary = s.displayName.toLowerCase() === primaryStreamName;
            return (
              <div
                key={s.displayName}
                className="w-48 h-full mx-4 flex flex-col"
              >
                <TwitchStream
                  channel={s.broadcasterLogin || s.displayName}
                  primary={isPrimary}
                  primaryContainerRect={primaryContainerRect}
                />
                <div className="mx-1">{s.displayName}</div>
                <div className="flex">
                  {!isPrimary && (
                    <button
                      className={"px-1 mx-1 border w-full bg-green-400"}
                      onClick={() => setPrimaryStream(s)}
                    >
                      Watch
                    </button>
                  )}
                  <button
                    className="px-1 mx-1 border w-full"
                    onClick={() => removeStream(i)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
          <div className="my-auto w-48 flex flex-col">
            <AddStream addNewStream={addNewStream} />
          </div>
          <div className="flex flex-col ml-auto">
            {!hasTwitchAuth && (
              <a
                className="mx-4 my-2 bg-purple-700 border px-2 py-1"
                href={TWITCH_AUTH_URL}
              >
                <FontAwesomeIcon icon={faTwitch} />
              </a>
            )}
            <button
              className={classNames(
                "mx-4 my-2 border px-2 py-1",
                showChat ? "text-white" : "bg-white text-black"
              )}
              onClick={() => setShowChat((state) => !state)}
            >
              <FontAwesomeIcon icon={faCommentDots} />
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
