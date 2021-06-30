import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { checkTwitchAuth, getStream, searchChannels } from "./twitch";
import { useQuery, useQueryClient } from "react-query";
import { usePrevious } from "react-use";
import scrollIntoView from "scroll-into-view-if-needed";

export default function AddStream({ addNewStream, className = "" }) {
  const queryClient = useQueryClient();
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
  const searchResults = useMemo(
    () =>
      searchResultData?.data.sort(({ displayName }) =>
        displayName.toLowerCase() === searchQuery.toLowerCase() ? -1 : 1
      ) ?? [],
    [searchResultData]
  );
  const prevSearchResults = usePrevious(searchResults);

  const [_selectedSearchResult, setSelectedSearchResult] = useState<number>(-1);
  const selectedSearchResult =
    _selectedSearchResult > -1 ? searchResults[_selectedSearchResult] : null;

  useEffect(() => {
    if (searchResults.length && searchResults !== prevSearchResults) {
      setSelectedSearchResult(
        // findIndex returns -1 if not found
        searchResults.findIndex(
          (res) => newStream.toLowerCase() === res.displayName.toLowerCase()
        )
      );
    }
  }, [newStream, prevSearchResults, searchResults]);

  const prefetchStreamData = useCallback(
    function prefetchStreamData(name) {
      queryClient.prefetchQuery(
        ["stream", name.toLowerCase()],
        ({ queryKey: [_key, userLogin] }) => getStream({ userLogin })
      );
    },
    [queryClient]
  );

  useEffect(() => {
    if (selectedSearchResult) {
      prefetchStreamData(selectedSearchResult.broadcasterLogin);
    }
  }, [prefetchStreamData, selectedSearchResult]);

  function submitNewStream(e) {
    e.preventDefault();

    let streamToSubmit;
    if (selectedSearchResult) {
      streamToSubmit = selectedSearchResult.displayName;
    } else if (newStream && newStream !== "") {
      const found = searchResults.find(
        (res) => newStream.toLowerCase() === res.displayName.toLowerCase()
      );
      streamToSubmit = found ?? newStream;
    }

    if (streamToSubmit) {
      addNewStream(streamToSubmit);
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
            if (
              e.key === "Escape" ||
              e.key === "ArrowUp" ||
              e.key === "ArrowDown" ||
              (e.key === "Tab" && newStream)
            ) {
              e.preventDefault();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Escape" && newStream.length > 0) {
              setNewStream("");
            }
            if (e.key === "ArrowUp") {
              setSelectedSearchResult((sel) => Math.max(-1, sel - 1));
            } else if (e.key === "ArrowDown") {
              setSelectedSearchResult((sel) =>
                Math.min(searchResults.length - 1, sel + 1)
              );
            } else {
              setSelectedSearchResult(-1);
            }
          }}
          value={selectedSearchResult?.displayName ?? newStream}
          onChange={(e) => setNewStream(e.target.value)}
        />
        {newStream &&
          (isFetching || newStream !== searchQuery ? (
            <div>Searching...</div>
          ) : (
            <div className="overflow-y-auto">
              {searchResults.map((result) => (
                <SearchResult
                  key={result.displayName}
                  result={result}
                  isSelected={result === selectedSearchResult}
                  onClick={() => {
                    addNewStream(result.displayName);
                    setNewStream("");
                  }}
                  prefetchStreamData={prefetchStreamData}
                />
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

function SearchResult({ result, isSelected, onClick, prefetchStreamData }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      scrollIntoView(ref.current, {
        scrollMode: "if-needed",
        block: "nearest",
      });
    }
  }, [isSelected]);

  return (
    <div
      ref={ref}
      className={classNames(
        "cursor-pointer hover:bg-gray-400",
        isSelected && "bg-gray-600"
      )}
      onClick={onClick}
      onMouseEnter={prefetchStreamData}
    >
      {result.displayName}
    </div>
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
