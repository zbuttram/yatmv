import { useState, useCallback, useEffect, useMemo } from "react";
import classNames from "classnames";
import { debounce } from "lodash";
import { checkTwitchAuth, searchChannels } from "./twitch";

export default function AddStream({ addNewStream }) {
  const [newStream, setNewStream] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const hasTwitchAuth = useMemo(() => checkTwitchAuth(), []);

  function submitNewStream(e) {
    e.preventDefault();
    if (newStream && newStream !== "") {
      addNewStream(newStream);
      setNewStream("");
      setSearchResults([]);
    }
    return false;
  }

  const loadSuggestions = useCallback(
    debounce(async function _loadSuggestions(newStream, signal) {
      try {
        const result = await searchChannels(newStream, {
          signal,
        });
        setSearchResults(
          result.data.slice(0, 5).map((res) => res.display_name)
        );
      } catch (e) {
        if (e.name !== "AbortError") {
          throw e;
        }
      } finally {
        setSearching(false);
      }
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
    const abortController = new AbortController();
    loadSuggestions(newStream, abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [newStream, loadSuggestions]);

  return (
    <form onSubmit={submitNewStream} className="flex">
      <div className="flex flex-col w-4/5 overflow-y-auto">
        <input
          type="text"
          placeholder="Channel"
          className="flex-grow bg-black border border-gray-400 focus:outline-none focus:border-white"
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
        {newStream &&
          (searching ? (
            <div>Searching...</div>
          ) : (
            searchResults.map((suggestion) => (
              <div
                key={suggestion}
                className={classNames(
                  "cursor-pointer hover:bg-gray-400",
                  suggestion === newStream && "bg-gray-400"
                )}
                onClick={() => {
                  addNewStream(suggestion);
                  setNewStream("");
                }}
              >
                {suggestion}
              </div>
            ))
          ))}
      </div>
      <input
        type="submit"
        value="Add"
        className="w-1/5 ml-1 mb-auto px-1 bg-black border"
      />
    </form>
  );
}
