import { useEffect, useState } from "react";
import classNames from "classnames";
import { checkTwitchAuth, searchChannels } from "./twitch";
import { useQuery } from "react-query";

export default function AddStream({ addNewStream, className = "" }) {
  const [newStream, setNewStream] = useState("");
  const searchQuery = useDebounce(newStream, 1000);
  const {
    data: searchResultData,
    remove: removeQuery,
    isFetching,
  } = useQuery(
    ["searchChannels", searchQuery],
    ({ queryKey: [_key, query] }) => searchChannels(query),
    {
      enabled: checkTwitchAuth() && !!newStream && !!searchQuery,
      staleTime: 5000,
    }
  );
  const searchResults = searchResultData?.data ?? [];

  function submitNewStream(e) {
    e.preventDefault();
    if (newStream && newStream !== "") {
      const found = searchResults.find(
        (res) => newStream.toLowerCase() === res.displayName.toLowerCase()
      );
      if (found) {
        addNewStream(found.displayName);
      } else {
        addNewStream(newStream);
      }
      setNewStream("");
      removeQuery();
    }
    return false;
  }

  return (
    <form onSubmit={submitNewStream} className={"flex h-full" + className}>
      <div className="flex flex-col w-4/5 h-full">
        <input
          type="text"
          placeholder="Channel"
          className="bg-black border border-gray-400 focus:outline-none focus:border-white"
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
          (isFetching || newStream !== searchQuery ? (
            <div>Searching...</div>
          ) : (
            <div className="overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.displayName}
                  className={classNames(
                    "cursor-pointer hover:bg-gray-400",
                    result.displayName.toLowerCase() ===
                      newStream.toLowerCase() && "bg-gray-400"
                  )}
                  onClick={() => {
                    addNewStream(result.displayName);
                    setNewStream("");
                  }}
                >
                  {result.displayName}
                </div>
              ))}
            </div>
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

// https://usehooks.com/useDebounce/
function useDebounce(value, delay) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );

  return debouncedValue;
}
