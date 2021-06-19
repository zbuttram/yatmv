import { Settings } from "./useSettings";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faComment,
  faCommentSlash,
  faCompressArrowsAlt,
  faExpandArrowsAlt,
  faRocket,
  faSlash,
} from "@fortawesome/free-solid-svg-icons";
import LinesEllipsis from "react-lines-ellipsis";
import { faGithub, faTwitch } from "@fortawesome/free-brands-svg-icons";
import { round } from "lodash";

import { PROJECT_URL, TWITCH_AUTH_URL } from "./const";
import { checkTwitchAuth, getUser, StreamData } from "./twitch";
import useBounding from "./useBounding";
import { useQuery } from "react-query";

export function Sidebar({
  className,
  settings,
  setSettings,
  streams,
  primaryStream,
  followedStreams,
  addStream,
}: {
  className?: string;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  followedStreams?: StreamData[];
  streams: string[];
  primaryStream?: string;
  addStream: (streamName: string) => void;
}) {
  const { boostMode, showChat, fullHeightPlayer } = settings;
  const [open, setOpen] = useState(false);

  const streamsLowercase = useMemo(
    () => streams.map((s) => s.toLowerCase()),
    [streams]
  );

  return (
    <div
      className={classNames(
        "sidebar flex flex-col",
        open ? "open w-56" : "w-16",
        className
      )}
    >
      <div className="self-end mb-2">
        <label>
          <span className="btn-txt">Collapse</span>
          <button
            title={open ? "Collapse" : "Expand"}
            className="btn-sidebar"
            onClick={() => setOpen((state) => !state)}
          >
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={classNames(
                "transition-transform",
                !open && "flip-horizontal"
              )}
              fixedWidth
            />
          </button>
        </label>
      </div>
      {!checkTwitchAuth() && (
        <div>
          <label>
            <button
              title="Connect to Twitch"
              className="btn-sidebar bg-black bg-purple-700"
              onClick={() => (window.location.href = TWITCH_AUTH_URL)}
            >
              <FontAwesomeIcon icon={faTwitch} fixedWidth />
            </button>
            <span className="btn-txt">Connect to Twitch</span>
          </label>
        </div>
      )}
      {followedStreams?.length ? (
        <>
          <hr />
          <div className="overflow-y-auto scrollbar-width-thin overflow-x-hidden bg-gray-900">
            {followedStreams
              .map((stream) => (
                <FollowedStream
                  key={stream.userId}
                  isOpen={streamsLowercase.includes(
                    stream.userName.toLowerCase()
                  )}
                  isPrimary={stream.userName.toLowerCase() === primaryStream}
                  stream={stream}
                  addStream={addStream}
                  sidebarExpanded={open}
                />
              ))
              .filter(Boolean)}
          </div>
          <hr className="mb-2" />
        </>
      ) : null}
      <div>
        <label>
          <button
            title={(showChat ? "Hide" : "Show") + " Chat"}
            className="btn-sidebar bg-black"
            onClick={() =>
              setSettings(({ showChat, ...state }) => ({
                ...state,
                showChat: !showChat,
              }))
            }
          >
            <FontAwesomeIcon
              icon={showChat ? faCommentSlash : faComment}
              fixedWidth
            />
          </button>
          <span className="btn-txt">{showChat ? "Hide" : "Show"} Chat</span>
        </label>
      </div>
      <div>
        <label>
          <button
            title={(boostMode ? "Disable" : "Enable") + " Boost Mode"}
            className="btn-sidebar bg-black"
            onClick={() =>
              setSettings(({ boostMode, ...state }) => ({
                ...state,
                boostMode: !boostMode,
              }))
            }
          >
            <div className="fa-layers fa-fw">
              <FontAwesomeIcon icon={faRocket} />
              {!boostMode && <FontAwesomeIcon icon={faSlash} />}
            </div>
          </button>
          <span className="btn-txt">
            {boostMode ? "Disable" : "Enable"} Boost Mode
          </span>
        </label>
      </div>
      <div>
        <label>
          <button
            title={
              (fullHeightPlayer ? "Disable" : "Enable") + " Full Height Player"
            }
            className="btn-sidebar bg-black"
            onClick={() =>
              setSettings(({ fullHeightPlayer, ...state }) => ({
                ...state,
                fullHeightPlayer: !fullHeightPlayer,
              }))
            }
          >
            {fullHeightPlayer ? (
              <FontAwesomeIcon icon={faCompressArrowsAlt} fixedWidth />
            ) : (
              <FontAwesomeIcon icon={faExpandArrowsAlt} fixedWidth />
            )}
          </button>
          <span className="btn-txt">
            {fullHeightPlayer ? "Disable" : "Enable"} Full Height
          </span>
        </label>
      </div>
      <div className="flex-grow" />
      <div className="mb-3 mt-2">
        <label>
          <a
            title="GitHub"
            href={PROJECT_URL}
            target="_blank"
            className="btn-sidebar bg-black"
            rel="noreferrer"
          >
            <FontAwesomeIcon icon={faGithub} fixedWidth />
          </a>
          <span className="btn-txt">GitHub</span>
        </label>
      </div>
    </div>
  );
}

function FollowedStream({
  isPrimary,
  isOpen,
  stream,
  addStream,
  sidebarExpanded,
}) {
  const [hovered, setHovered] = useState(false);
  const id = "followed-stream-" + stream.userId;
  const rect = useBounding(id);

  const { data: user } = useQuery(
    ["twitchUser", stream.userId],
    ({ queryKey: [_key, id] }) => getUser(id)
  );

  if (!user) {
    return null;
  }

  const streamTitle = (
    <div className={classNames(sidebarExpanded ? "max-w-40" : "w-0 flex-grow")}>
      <LinesEllipsis maxLine={2} text={stream.title} />
    </div>
  );

  return (
    <>
      <div
        id={id}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={classNames(
          "bg-opacity-50",
          isPrimary && "bg-red-600",
          isOpen && !isPrimary && "bg-blue-800"
        )}
      >
        <label className="flex">
          <button
            className={classNames(
              "btn-sidebar-followed w-8 flex-shrink-0",
              sidebarExpanded ? "mr-2" : "mr-4"
            )}
            onClick={() => addStream(stream.userName)}
          >
            <img
              className={classNames("rounded-full")}
              src={user.profileImageUrl}
              alt={stream.userName}
            />
          </button>
          <div className="btn-txt flex-grow flex flex-col">
            <div className="flex mt-1">
              <div className="sidebar-stream-name" title={stream.userName}>
                {stream.userName}
              </div>
              <div className="text-xs mr-2 text-red-400 followed-viewer-count">
                &#9679; {simplifyViewerCount(stream.viewerCount)}
              </div>
            </div>
            <div className="sidebar-stream-game mt-1">{stream.gameName}</div>
          </div>
        </label>
      </div>
      <div
        className={classNames(
          "followed-stream-tooltip",
          !hovered && "invisible"
        )}
        style={{
          left: rect.right && `calc(${rect.right}px + 0.75rem)`,
          top: rect.top,
          zIndex: 99,
        }}
      >
        {sidebarExpanded ? (
          streamTitle
        ) : (
          <div className="flex flex-col text-sm min-w-32">
            <div className="text-purple-500">
              {stream.userName}
              {stream.gameName && <> &#183; {stream.gameName}</>}
            </div>
            <div className="flex">{streamTitle}</div>
            <div className="ml-auto text-red-400">
              &#9679; {simplifyViewerCount(stream.viewerCount)}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function simplifyViewerCount(viewerCount) {
  if (viewerCount < 1000) {
    return viewerCount;
  } else {
    return round(viewerCount / 1000, viewerCount < 100000 ? 1 : 0) + "k";
  }
}
