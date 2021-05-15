import { useState, useEffect } from "react";
import classNames from "classnames";

import TwitchChat from "./TwitchChat";
import TwitchStream from "./TwitchStream";

const pageURL = new URL(window.location.href);
const urlStreams = pageURL.searchParams.get("streams")
  ? pageURL.searchParams.get("streams").split(",")
  : [];
const urlPrimary = pageURL.searchParams.get("primary");

function App() {
  const [streams, setStreams] = useState(urlStreams);
  const [primaryStream, setPrimaryStream] = useState(urlPrimary);

  const [newStream, setNewStream] = useState("");

  function addNewStream(e) {
    e.preventDefault();
    setStreams((s) => [...s, newStream]);
    setNewStream("");
    return false;
  }

  function removeStream(streamIndex) {
    if (streams.indexOf(primaryStream) === streamIndex) {
      setPrimaryStream(streams[streamIndex - 1]);
    }
    setStreams((s) => s.filter((_, i) => i !== streamIndex));
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
  }, [streams, primaryStream]);

  return (
    <>
      <main className="p-2 h-screen">
        {primaryStream && (
          <div className="flex pb-4 h-3/4">
            <TwitchStream
              channel={primaryStream}
              primary={true}
              className="flex-grow h-full"
            />

            <TwitchChat channel={primaryStream} className="w-1/5" />
          </div>
        )}
        <div className="h-1/4 mx-auto flex">
          {streams.map((s, i) => {
            const isPrimary = s === primaryStream;
            return (
              <div key={s} className="w-48 h-full mx-4 flex flex-col">
                {isPrimary ? (
                  <div className="flex-grow flex">
                    <span className="m-auto">WATCHING</span>
                  </div>
                ) : (
                  <TwitchStream channel={s} className="flex-grow" />
                )}
                <div className="mx-1">{s}</div>
                <div className="flex">
                  <button
                    className={classNames(
                      "px-1 mx-1 border w-full",
                      isPrimary ? "bg-gray-800" : "bg-green-400"
                    )}
                    onClick={() => setPrimaryStream(s)}
                    disabled={isPrimary}
                  >
                    Primary
                  </button>
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
          <div className="my-auto w-48">
            <form onSubmit={addNewStream} className="flex">
              <input
                type="text"
                placeholder="Channel"
                className="mr-1 bg-black border w-4/5"
                value={newStream}
                onChange={(e) => setNewStream(e.target.value)}
              />
              <input
                type="submit"
                value="Add"
                className="px-1 bg-black border w-1/5"
              />
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
