import { useState, useEffect } from "react";
import produce from "immer";

import TwitchChat from "./TwitchChat";
import TwitchStream from "./TwitchStream";
import useBounding from "./useBounding";
import events from "./events";

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
    if (newStream && newStream !== "") {
      setStreams((s) => [...s, newStream]);
      setNewStream("");
    }
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
  }, [streams, primaryStream]);

  const primaryContainerRect = useBounding("primary-stream-container");

  return (
    <>
      <main className="pb-3 h-screen">
        {primaryStream && (
          <div className="flex pb-4 h-4/5">
            <div id="primary-stream-container" className="flex-grow h-full" />
            <TwitchChat channel={primaryStream} className="w-1/5" />
          </div>
        )}
        <div className="h-1/5 mx-auto flex">
          {streams.map((s, i) => {
            const isPrimary = s === primaryStream;
            return (
              <div key={s} className="w-48 h-full mx-4 flex flex-col">
                <TwitchStream
                  channel={s}
                  className=""
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
