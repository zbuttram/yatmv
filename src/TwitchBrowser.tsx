import classNames from "classnames";
import { Fragment, ReactNode, useEffect, useState } from "react";
import { faUsers, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
} from "@tanstack/react-query";
import { faTwitch } from "@fortawesome/free-brands-svg-icons";
import { InView } from "react-intersection-observer";

import { Modal, ModalProps } from "./Modal";
import {
  CategoryData,
  getStreams,
  getTopGames,
  PaginatedResponse,
  searchCategories,
  searchChannels,
  StreamData,
} from "./twitch";
import { simplifyViewerCount, sizeThumbnailUrl } from "./utils";
import {
  TWITCH_CATEGORY_REFETCH,
  TWITCH_BROWSER_CHANNELS_REFETCH,
} from "./const";
import { useDebounce } from "./useDebounce";

export default function TwitchBrowser({
  isOpen,
  close,
  followedStreams,
  addNewStream,
}: ModalProps & {
  followedStreams: StreamData[] | undefined;
  addNewStream: (name: string) => void;
}) {
  const [tab, setTab] = useState<"followed" | "categories" | "channels">(
    "followed"
  );

  return (
    <Modal isOpen={isOpen} close={close}>
      <div className="absolute top-1 left-2 text-3xl">
        <FontAwesomeIcon className="text-purple-700" icon={faTwitch} />
      </div>
      <div className="p-4" style={{ height: "3.5rem" }}>
        <div className="flex justify-center">
          <Tab active={tab === "followed"} onClick={() => setTab("followed")}>
            Followed
          </Tab>
          <Tab
            active={tab === "categories"}
            onClick={() => setTab("categories")}
          >
            Categories
          </Tab>
          <Tab active={tab === "channels"} onClick={() => setTab("channels")}>
            Streams
          </Tab>
        </div>
      </div>
      <div
        className="border-t border-gray-400 pt-2 pb-3"
        style={{ height: "calc(100% - 3.5rem)" }}
      >
        {(() => {
          switch (tab) {
            case "followed":
              return (
                <div className="flex flex-wrap gap-3 justify-center overflow-y-auto max-h-full">
                  {followedStreams?.map((stream) => (
                    <Stream
                      key={stream.userLogin}
                      onClick={() => addNewStream(stream.userLogin)}
                      stream={stream}
                    />
                  ))}
                </div>
              );
            case "categories":
              return <Categories addNewStream={addNewStream} isOpen={isOpen} />;
            case "channels":
              return <Channels addNewStream={addNewStream} isOpen={isOpen} />;
            default:
              return null;
          }
        })()}
      </div>
    </Modal>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={classNames("mr-2", active ? "font-bold underline" : "")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Stream(props: { onClick: () => void; stream: StreamData }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={classNames("w-56", imgLoaded ? "" : "invisible")}>
      <img
        className="cursor-pointer"
        onClick={props.onClick}
        onLoad={() => setImgLoaded(true)}
        src={sizeThumbnailUrl({
          url: props.stream.thumbnailUrl,
          width: "440",
          height: "248",
        })}
        alt={`${props.stream.userLogin} thumbnail`}
      />
      <div className="flex">
        <h3 className="font-semibold">{props.stream.userName}</h3>
        <div className="grow" />
        <div className="text-sm text-right my-auto mr-1 text-red-400 whitespace-nowrap">
          {simplifyViewerCount(props.stream.viewerCount)}{" "}
          <FontAwesomeIcon icon={faUsers} />
        </div>
      </div>
      <div
        className={classNames("text-xs truncate")}
        title={props.stream.title}
      >
        {props.stream.title}
      </div>
    </div>
  );
}

function Categories({ addNewStream, isOpen }) {
  const [category, setCategory] = useState(null);

  return category ? (
    <ShowCategory
      category={category}
      back={() => setCategory(null)}
      addNewStream={addNewStream}
      isOpen={isOpen}
    />
  ) : (
    <BrowseCategories setCategory={setCategory} />
  );
}

function BrowseCategories({ setCategory }) {
  const [query, setQuery] = useState("");

  const search = useInfiniteQuery({
    queryKey: ["searchCategories", query],
    queryFn: ({ pageParam }) => searchCategories({ query, after: pageParam }),
    initialPageParam: undefined as string | undefined,
    enabled: !!query,
    getNextPageParam: (lastPage) => lastPage.pagination.cursor,
    refetchInterval: TWITCH_CATEGORY_REFETCH,
    staleTime: 5000,
  });

  const top = useInfiniteQuery({
    queryKey: ["topGames"],
    queryFn: ({ pageParam }) =>
      getTopGames({ first: pageParam ? undefined : 50, after: pageParam }),
    initialPageParam: undefined as string | undefined,
    enabled: !query,
    getNextPageParam: (lastPage) => lastPage.pagination.cursor,
    refetchInterval: TWITCH_CATEGORY_REFETCH,
  });

  const active = query ? search : top;

  return (
    <>
      <div className="flex justify-center" style={{ height: "2.75rem" }}>
        <input
          type="search"
          className="bg-black mt-1 mb-3 border border-gray-400 px-1"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div
        className="flex flex-wrap gap-3 justify-center overflow-y-auto"
        style={{ maxHeight: "calc(100% - 2.75rem)" }}
      >
        {active.data?.pages?.map((page, pageIdx) => (
          <Fragment key={pageIdx}>
            {page.data.map((category) => (
              <CategoryListing
                key={category.id}
                category={category}
                setCategory={setCategory}
              />
            ))}
          </Fragment>
        ))}
        <ListEnd query={active} emptyText="No categories found." />
      </div>
    </>
  );
}

function CategoryListing({ category, setCategory }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className={classNames(
        "w-40 hover:text-purple-700",
        imgLoaded ? "" : "invisible"
      )}
    >
      <img
        onClick={() => setCategory(category)}
        onLoad={() => setImgLoaded(true)}
        className="cursor-pointer mx-auto"
        src={sizeThumbnailUrl({
          url: category.boxArtUrl,
          width: "285",
          height: "380",
        })}
        alt={`${category.name} box art`}
      />
      <div className="truncate w-full text-center">{category.name}</div>
    </div>
  );
}

function ShowCategory({
  category,
  back,
  addNewStream,
  isOpen,
}: {
  category: CategoryData | null;
  back: () => void;
  addNewStream: (name: string) => void;
  isOpen: boolean;
}) {
  const streams = useInfiniteQuery({
    queryKey: ["getStreamsByGameId", category?.id],
    queryFn: ({ pageParam }) =>
      getStreams({
        gameId: category?.id,
        language: "en",
        after: pageParam,
        first: pageParam ? undefined : 50,
      }),
    initialPageParam: undefined as string | undefined,
    enabled: !!category && isOpen,
    getNextPageParam: (lastPage) => lastPage.pagination.cursor,
    refetchInterval: TWITCH_BROWSER_CHANNELS_REFETCH,
  });

  if (!category) {
    return null;
  }

  return (
    <>
      <div className="p-4 flex justify-between" style={{ height: "4rem" }}>
        <button onClick={back} className="mr-3 font-semibold text-lg">
          <FontAwesomeIcon icon={faArrowLeft} />{" "}
          <span className="underline">Back</span>
        </button>
        <div className="text-2xl">{category.name}</div>
      </div>
      <div
        className="flex flex-wrap gap-3 justify-center overflow-y-auto"
        style={{ maxHeight: "calc(100% - 4rem)" }}
      >
        {streams.data?.pages.map((page, pageIdx) => (
          <Fragment key={pageIdx}>
            {page.data.map((stream) => (
              <Stream
                key={stream.userLogin}
                onClick={() => addNewStream(stream.userLogin)}
                stream={stream}
              />
            ))}
          </Fragment>
        ))}
        <ListEnd
          query={streams}
          emptyText="No live streams in this category."
        />
      </div>
    </>
  );
}

function Channels({
  addNewStream,
  isOpen,
}: {
  addNewStream: (name: string) => void;
  isOpen: boolean;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 1000);

  const search = useInfiniteQuery({
    queryKey: ["searchStreams", debouncedQuery],
    queryFn: async ({ pageParam }) => {
      let channels = await searchChannels(debouncedQuery, {
        first: pageParam ? undefined : 50,
        after: pageParam,
      });
      // Twitch can return an empty page that still has a cursor; look a few
      // pages ahead before deciding the results have run out
      for (
        let skipped = 0;
        !channels.data.length &&
        channels.pagination.cursor &&
        skipped < EMPTY_SEARCH_PAGE_LOOKAHEAD;
        skipped++
      ) {
        channels = await searchChannels(debouncedQuery, {
          after: channels.pagination.cursor,
        });
      }
      if (!channels.data.length) {
        // an empty user_login filter would return Twitch's top streams
        // instead. if Twitch still has a cursor, keep it but mark the page
        // stalled: ListEnd then offers a manual "Load more" rather than
        // letting the on-screen sentinel page through empty results forever
        return {
          data: [] as StreamData[],
          pagination: channels.pagination,
          stalled: true,
        };
      }
      const streams = await getStreams({
        userLogin: channels.data.map((c) => c.broadcasterLogin),
        // /streams defaults to 20 results; ask for one per channel
        first: channels.data.length,
      });
      return {
        ...streams,
        pagination: channels.pagination,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.cursor,
    staleTime: 5000,
    refetchInterval: TWITCH_BROWSER_CHANNELS_REFETCH,
    enabled: isOpen && !!debouncedQuery,
  });
  const top = useInfiniteQuery({
    queryKey: ["getTopStreams"],
    queryFn: ({ pageParam }) =>
      getStreams({
        language: "en",
        after: pageParam,
        first: pageParam ? undefined : 50,
      }),
    initialPageParam: undefined as string | undefined,
    enabled: isOpen && !debouncedQuery,
    refetchInterval: TWITCH_BROWSER_CHANNELS_REFETCH,
    getNextPageParam: (lastPage) => lastPage.pagination.cursor,
  });

  // key off the debounced value so we never page the disabled empty-query search
  const active = debouncedQuery ? search : top;

  return (
    <>
      <div className="flex justify-center" style={{ height: "2.75rem" }}>
        <input
          type="search"
          className="bg-black mt-1 mb-3 border border-gray-400 px-1"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div
        className="flex flex-wrap gap-3 justify-center overflow-y-auto"
        style={{ maxHeight: "calc(100% - 2.75rem)" }}
      >
        {active.data?.pages.map((page, pageIdx) => (
          <Fragment key={pageIdx}>
            {page.data.map((stream) => (
              <Stream
                key={stream.userLogin}
                onClick={() => addNewStream(stream.userLogin)}
                stream={stream}
              />
            ))}
          </Fragment>
        ))}
        <ListEnd query={active} emptyText="No live channels found." />
      </div>
    </>
  );
}

const EMPTY_SEARCH_PAGE_LOOKAHEAD = 3;

/**
 * Bottom of an infinitely scrolling list: loads the next page when scrolled
 * into view, and says when a list is empty, has ended, or failed to load.
 */
function ListEnd({
  query,
  emptyText,
}: {
  query: UseInfiniteQueryResult<InfiniteData<ListPage>>;
  emptyText: string;
}) {
  const {
    data,
    error,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch,
  } = query;
  const pages = data?.pages ?? [];
  const isEmpty = pages.every((page) => !page.data.length);
  // a failed background refetch keeps the data already on screen, so only
  // report errors that left the list without what it asked for
  const failed = !!error && (!data || isFetchNextPageError);
  const stalled = !!pages.at(-1)?.stalled;

  useEffect(() => {
    if (error) console.error("Twitch browser list failed to load", error);
  }, [error]);

  let message: ReactNode = null;
  if (failed) {
    message = isFetching ? (
      "Retrying…"
    ) : (
      <>
        Couldn't load {isFetchNextPageError ? "more " : ""}results (
        {error.message}).{" "}
        <button
          className="underline"
          onClick={() => (isFetchNextPageError ? fetchNextPage() : refetch())}
        >
          Retry
        </button>
      </>
    );
  } else if (stalled && hasNextPage && !isFetching) {
    message = (
      <>
        No {isEmpty ? "" : "more "}matches in the next few pages.{" "}
        <button className="underline" onClick={() => fetchNextPage()}>
          Load more
        </button>
      </>
    );
  } else if (data && !hasNextPage && !isFetching) {
    message = isEmpty ? emptyText : "End of results.";
  }

  return (
    <>
      {hasNextPage && !failed && !stalled && (
        <InView
          as="span"
          // remount after each page so a sentinel still on screen fires again
          key={pages.length}
          onChange={(inView) =>
            inView && !isFetchingNextPage && fetchNextPage()
          }
        />
      )}
      {message && (
        <div className="w-full py-4 text-center text-gray-400">{message}</div>
      )}
    </>
  );
}

/** A list page; `stalled` marks a search page that gave up on empty results. */
type ListPage = PaginatedResponse<unknown> & { stalled?: boolean };
