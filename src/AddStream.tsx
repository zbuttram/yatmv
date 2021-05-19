import { useState, useCallback, useEffect, useMemo } from "react";
import classNames from "classnames";
import { debounce, DebouncedFunc } from "lodash";
import {
  checkTwitchAuth,
  searchChannels,
  StreamWithTwitchData,
} from "./twitch";

export default function AddStream({ addNewStream }) {
  const [newStream, setNewStream] = useState("");
  const [searchResults, setSearchResults] = useState<StreamWithTwitchData[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const hasTwitchAuth = useMemo(() => checkTwitchAuth(), []);

  function submitNewStream(e) {
    e.preventDefault();
    if (newStream && newStream !== "") {
      const found = searchResults.find(
        (res) => newStream.toLowerCase() === res.displayName.toLowerCase()
      );
      if (found) {
        addNewStream(found);
      } else {
        addNewStream({ displayName: newStream });
      }
      setNewStream("");
      setSearchResults([]);
    }
    return false;
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const loadSuggestions = useCallback<
    DebouncedFunc<(newStream: string, signal: AbortSignal) => Promise<void>>
  >(
    debounce(async function _loadSuggestions(
      newStream: string,
      signal: AbortSignal
    ) {
      try {
        const result = await searchChannels(newStream, {
          first: 6,
          signal,
        });
        setSearchResults(result.data.map((res) => res));
      } catch (e) {
        if (e.name !== "AbortError") {
          throw e;
        }
      } finally {
        setSearching(false);
      }
    },
    500),
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
  }, [newStream, loadSuggestions, hasTwitchAuth]);

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
              setNewStream(searchResults[0].displayName);
            }
          }}
          value={newStream}
          onChange={(e) => setNewStream(e.target.value)}
        />
        {newStream &&
          (searching ? (
            <div>Searching...</div>
          ) : (
            searchResults.map((result) => (
              <div
                key={result.displayName}
                className={classNames(
                  "cursor-pointer hover:bg-gray-400",
                  result.displayName.toLowerCase() ===
                    newStream.toLowerCase() && "bg-gray-400"
                )}
                onClick={() => {
                  addNewStream(result);
                  setNewStream("");
                }}
              >
                {result.displayName}
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
