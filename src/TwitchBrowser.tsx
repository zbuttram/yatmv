import classNames from "classnames";
import { ReactNode, useState } from "react";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useInfiniteQuery, useQuery } from "react-query";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { faTwitch } from "@fortawesome/free-brands-svg-icons";
import { Waypoint } from "react-waypoint";

import { Modal, ModalProps } from "./Modal";
import {
  CategoryData,
  ChannelData,
  getStream,
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
  const [tab, setTab] =
    useState<"followed" | "categories" | "channels">("followed");

  return (
    <Modal isOpen={isOpen} close={close}>
      <div className="absolute top-1 left-2 text-3xl">
        <FontAwesomeIcon className="text-purple-700" icon={faTwitch} />
      </div>
      <div className="p-4">
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
      <div className="border-t border-gray-400 pt-2 pb-3">
        {(() => {
          switch (tab) {
            case "followed":
              return (
                <div className="flex flex-wrap gap-3 justify-center overflow-y-auto modal-scroll">
                  {followedStreams?.map((stream) => (
                    <Stream
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
        <div className="flex-grow" />
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

  const { data: queryData, fetchNextPage: fetchNextQuery } = useInfiniteQuery(
    ["searchCategories", query],
    ({ queryKey: [_, q], pageParam }) =>
      searchCategories({ query: q, after: pageParam }),
    {
      enabled: !!query,
      getNextPageParam: (lastPage) => lastPage.pagination.cursor,
      refetchInterval: TWITCH_CATEGORY_REFETCH,
      staleTime: 5000,
    }
  );

  const { data: topData, fetchNextPage: fetchNextTop } = useInfiniteQuery(
    "topGames",
    ({ pageParam = 0 }) => getTopGames({ first: 30, after: pageParam }),
    {
      enabled: !query,
      getNextPageParam: (lastPage) => lastPage.pagination.cursor,
      refetchInterval: TWITCH_CATEGORY_REFETCH,
    }
  );

  const data = query ? queryData : topData;

  return (
    <>
      <div className="flex justify-center">
        <input
          type="search"
          className="bg-black mt-1 mb-3 border border-gray-400 px-1"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3 justify-center overflow-y-auto modal-scroll">
        {data?.pages?.map((page) => (
          <>
            {page.data.map((category) => (
              <CategoryListing category={category} setCategory={setCategory} />
            ))}
          </>
        ))}
        <Waypoint
          onEnter={() => (query ? fetchNextQuery() : fetchNextTop())}
          bottomOffset="20%"
        />
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
  const { data, fetchNextPage } = useInfiniteQuery(
    ["getStreamsByGameId", category?.id],
    ({ queryKey: [_, gameId], pageParam }) =>
      getStreams({
        gameId,
        after: pageParam,
        first: pageParam ? undefined : 50,
      }),
    {
      enabled: !!category && isOpen,
      getNextPageParam: (lastPage) => lastPage.pagination.cursor,
      refetchInterval: TWITCH_BROWSER_CHANNELS_REFETCH,
    }
  );

  if (!category) {
    return null;
  }

  return (
    <>
      <div className="p-4 flex justify-between">
        <button onClick={back} className="mr-3 font-semibold text-lg">
          <FontAwesomeIcon icon={faArrowLeft} />{" "}
          <span className="underline">Back</span>
        </button>
        <div className="text-2xl">{category.name}</div>
      </div>
      <div className="overflow-y-auto modal-scroll">
        <div className="flex flex-wrap gap-3 justify-center">
          {data?.pages.map((page) => (
            <>
              {page.data.map((stream) => (
                <Stream
                  onClick={() => addNewStream(stream.userLogin)}
                  stream={stream}
                />
              ))}
            </>
          ))}
          <Waypoint onEnter={() => fetchNextPage()} bottomOffset="20%" />
        </div>
      </div>
    </>
  );
}

function Channels({ addNewStream, isOpen }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 1000);

  const { data: queryData, fetchNextPage: fetchNextQuery } = useInfiniteQuery(
    ["searchChannels", debouncedQuery],
    ({ queryKey: [_key, query], pageParam }) =>
      searchChannels(query, {
        first: pageParam ? undefined : 50,
        after: pageParam,
      }),
    {
      getNextPageParam: (lastPage) => lastPage.pagination.cursor,
      staleTime: 5000,
      refetchInterval: TWITCH_BROWSER_CHANNELS_REFETCH,
      enabled: isOpen && !!query,
    }
  );
  const { data: topData, fetchNextPage: fetchNextTop } = useInfiniteQuery(
    ["getTopStreams"],
    ({ pageParam }) =>
      getStreams({ after: pageParam, first: pageParam ? undefined : 50 }),
    {
      enabled: isOpen && !query,
      refetchInterval: TWITCH_BROWSER_CHANNELS_REFETCH,
      getNextPageParam: (lastPage) => lastPage.pagination.cursor,
    }
  );

  const data = query ? queryData : topData;

  return (
    <>
      <div className="flex justify-center">
        <input
          type="search"
          className="bg-black mt-1 mb-3 border border-gray-400 px-1"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-3 justify-center overflow-y-auto modal-scroll">
        {data?.pages.map(
          (page: PaginatedResponse<StreamData | ChannelData>) => (
            <>
              {page.data.map((pageData) =>
                query ? (
                  <Channel
                    channel={pageData as ChannelData}
                    addNewStream={addNewStream}
                  />
                ) : (
                  <Stream
                    onClick={addNewStream}
                    stream={pageData as StreamData}
                  />
                )
              )}
            </>
          )
        )}
        <Waypoint
          onEnter={() => (query ? fetchNextQuery() : fetchNextTop())}
          bottomOffset="20%"
        />
      </div>
    </>
  );
}

function Channel({
  channel,
  addNewStream,
}: {
  channel: ChannelData;
  addNewStream: (name: string) => void;
}) {
  const { data } = useQuery(
    ["stream", channel.broadcasterLogin],
    ({ queryKey: [_key, userLogin] }) => getStream({ userLogin }),
    {}
  );

  if (data) {
    return (
      <Stream
        onClick={() => addNewStream(channel.broadcasterLogin)}
        stream={data}
      />
    );
  } else {
    return null;
  }
}
