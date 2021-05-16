import { useState, useEffect, useCallback } from "react";
import produce from "immer";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitch } from "@fortawesome/free-brands-svg-icons";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons";
import Cookies from "js-cookie";
import { debounce } from "lodash";

import TwitchChat from "./TwitchChat";
import TwitchStream from "./TwitchStream";
import useBounding from "./useBounding";
import events from "./events";
import { TWITCH_ACCESS_TOKEN_COOKIE } from "./const";
import { searchChannels } from "./twitch";

const STREAM_STATE_COOKIE = "yatmv-state";

const pageURL = new URL(window.location.href);
const urlStreams = pageURL.searchParams.get("streams")
  ? pageURL.searchParams.get("streams").split(",")
  : [];
const urlPrimary = pageURL.searchParams.get("primary");

let reloadFromAuthStreams, reloadFromAuthPrimary;
if (document.location.hash) {
  const hashParams = new URLSearchParams(document.location.hash.slice(1));
  if (hashParams.has("access_token")) {
    Cookies.set(TWITCH_ACCESS_TOKEN_COOKIE, hashParams.get("access_token"));
    document.location.hash = "";
    const rawStreamState = Cookies.get(STREAM_STATE_COOKIE);
    if (rawStreamState) {
      const parsedStreamState = JSON.parse(rawStreamState);
      reloadFromAuthStreams = parsedStreamState.streams;
      reloadFromAuthPrimary = parsedStreamState.primaryStream;
    }
  }
}

const TWITCH_SCOPES = [];
const TWITCH_AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=1sphvbcdy1eg1p9n122ptcloxvg7wm&redirect_uri=${encodeURIComponent(
  window.location.origin
)}&response_type=token&scope=${encodeURIComponent(TWITCH_SCOPES.join(" "))}`;
const hasTwitchAuth = !!Cookies.get(TWITCH_ACCESS_TOKEN_COOKIE);

function App() {
  const [showChat, setShowChat] = useState(true);
  const [streams, setStreams] = useState(reloadFromAuthStreams || urlStreams);
  const [primaryStream, setPrimaryStream] = useState(
    reloadFromAuthPrimary || urlPrimary || streams[0]
  );
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [newStream, setNewStream] = useState("");

  function addNewStream(stream = newStream) {
    if (stream && stream !== "") {
      if (streams.length < 1) {
        setPrimaryStream(stream);
      }
      setStreams((s) => [...s, stream]);
      setNewStream("");
      setSearchResults([]);
    }
  }

  function submitNewStream(e) {
    e.preventDefault();
    addNewStream();
    return false;
  }

  function removeStream(index) {
    if (streams.indexOf(primaryStream) === index) {
      setPrimaryStream(streams[index - 1]);
    }
    setStreams(
      produce((draft) => {
        draft.splice(index, 1);
      })
    );
    events.emit("removeStream");
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    streams ? params.set("streams", streams) : params.delete("streams");
    primaryStream
      ? params.set("primary", primaryStream)
      : params.delete("primary");

    url.search = params.toString();
    window.history.replaceState({}, window.document.title, url);
    setTimeout(() => {
      Cookies.set(
        STREAM_STATE_COOKIE,
        JSON.stringify({ streams, primaryStream })
      );
    });
  }, [streams, primaryStream]);

  const loadSuggestions = useCallback(
    debounce(async function loadSuggestions(newStream) {
      const result = await searchChannels(newStream);
      setSearchResults(result.data.slice(0, 5).map((res) => res.display_name));
      setSearching(false);
    }, 500),
    [setSearchResults]
  );

  useEffect(() => {
    if (!hasTwitchAuth) {
      return;
    }
    if (!newStream) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    loadSuggestions(newStream);
  }, [newStream, loadSuggestions]);

  const primaryContainerRect = useBounding("primary-stream-container");

  return (
    <>
      <main className="pb-3 h-screen">
        <div
          className={classNames("flex pb-4 h-4/5", !primaryStream && "hidden")}
        >
          <div id="primary-stream-container" className="flex-grow h-full" />
          <TwitchChat
            channel={primaryStream}
            className={classNames(showChat ? "w-1/5" : "w-0", "transition-all")}
          />
        </div>
        <div className="h-1/5 mx-auto flex">
          {streams.map((s, i) => {
            const isPrimary = s === primaryStream;
            return (
              <div key={s} className="w-48 h-full mx-4 flex flex-col">
                <TwitchStream
                  channel={s}
                  primary={isPrimary}
                  primaryContainerRect={primaryContainerRect}
                />
                <div className="mx-1">{s}</div>
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
            <form onSubmit={submitNewStream} className="flex">
              <div className="flex flex-col w-4/5 overflow-y-auto">
                <input
                  type="text"
                  placeholder="Channel"
                  className="flex-grow bg-black border"
                  onKeyDown={(e) => {
                    if (e.key === "Tab" && newStream) {
                      e.preventDefault();
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === "Tab" && searchResults[0]) {
                      e.preventDefault();
                      setNewStream(searchResults[0]);
                    }
                  }}
                  value={newStream}
                  onChange={(e) => setNewStream(e.target.value)}
                />
                {searching ? (
                  <div>Loading...</div>
                ) : (
                  searchResults.map((suggestion) => (
                    <div
                      key={suggestion}
                      className="cursor-pointer hover:bg-gray-400"
                      onClick={() => {
                        addNewStream(suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))
                )}
              </div>
              <input
                type="submit"
                value="Add"
                className="w-1/5 ml-1 mb-auto px-1 bg-black border"
              />
            </form>
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

export default App;
