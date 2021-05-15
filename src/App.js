import { useState, useEffect } from "react";
import TwitchChat from "./TwitchChat";

import TwitchStream from "./TwitchStream";

const pageURL = new URL(window.location.href);
const urlStreams = pageURL.searchParams.get("streams")
  ? pageURL.searchParams.get("streams").split(",")
  : ["Kate"];
const urlPrimary = pageURL.searchParams.get("primary");

function App() {
  const [streams, setStreams] = useState(urlStreams);
  const [primaryStreamIndex, setPrimaryStreamIndex] = useState(
    urlPrimary ? urlStreams.findIndex((s) => s === urlPrimary) : 0
  );

  const primaryStream = streams[primaryStreamIndex];

  const [newStream, setNewStream] = useState("");

  const [primaryPlayerSettings, setPrimaryPlayerSettings] = useState({});

  function addNewStream(e) {
    e.preventDefault();
    setStreams((s) => [...s, newStream]);
    setNewStream("");
    return false;
  }

  function removeStream(streamIndex) {
    setStreams((s) => s.filter((_, i) => i === streamIndex));
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    params.set("streams", streams);
    primaryStream && params.set("primary", primaryStream);
    url.search = params.toString();
    window.history.replaceState({}, window.document.title, url);
  }, [streams, primaryStreamIndex]);

  return (
    <>
      <main className="m-2">
        <div className="flex mb-4">
          <div className="flex-grow">
            <TwitchStream channel={primaryStream} primary={true} />
          </div>
          <div className="w-1/5">
            <TwitchChat channel={primaryStream} />
          </div>
        </div>
        <div className="h-60 mx-auto flex">
          {streams.map((s, i) => (
            <div key={s} className="w-48 h-full mx-4">
              <TwitchStream channel={s} />
              <div className="mx-1">{s}</div>
              <div className="flex">
                <button
                  className="px-1 mx-1 border w-full bg-green-600"
                  onClick={() => setPrimaryStreamIndex(i)}
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
          ))}
          <div className="my-auto w-48">
            <form onSubmit={addNewStream} className="flex">
              <input
                type="text"
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
