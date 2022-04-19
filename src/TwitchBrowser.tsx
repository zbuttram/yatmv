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
  getStreams,
  getTopGames,
  searchCategories,
  StreamData,
} from "./twitch";
import { simplifyViewerCount, sizeThumbnailUrl } from "./utils";
import {
  TWITCH_CATEGORY_REFETCH,
  TWITCH_CATEGORY_STREAMS_REFETCH,
} from "./const";

export default function TwitchBrowser({
  isOpen,
  close,
  followedStreams,
  addNewStream,
}: ModalProps & {
  followedStreams: StreamData[] | undefined;
  addNewStream: (name: string) => void;
}) {
  const [tab, setTab] = useState<"followed" | "categories">("followed");

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
        </div>
      </div>
      <div className="border-t border-gray-400 pt-2 pb-3">
        {tab === "followed" ? (
          <div className="flex flex-wrap gap-3 justify-center overflow-y-auto modal-scroll">
            {followedStreams?.map((stream) => (
              <Stream
                onClick={() => addNewStream(stream.userLogin)}
                stream={stream}
              />
            ))}
          </div>
        ) : null}
        {tab === "categories" ? (
          <Categories addNewStream={addNewStream} isOpen={isOpen} />
        ) : null}
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
    <div className={classNames("w-56", imgLoaded ? "" : "hidden")}>
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
        imgLoaded ? "" : "hidden"
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
      refetchInterval: TWITCH_CATEGORY_STREAMS_REFETCH,
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
