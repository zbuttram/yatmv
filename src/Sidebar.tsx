import { Settings } from "./useSettings";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { FollowedStreamData } from "./useTwitchData";
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
import { PROJECT_URL, TWITCH_AUTH_URL } from "./const";
import { faGithub, faTwitch } from "@fortawesome/free-brands-svg-icons";
import { checkTwitchAuth } from "./twitch";

export function Sidebar({
  className,
  settings,
  setSettings,
  hasTwitchAuth,
  streams,
  primaryStream,
  followedStreams,
  addStream,
}: {
  className?: string;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  hasTwitchAuth: boolean;
  followedStreams: FollowedStreamData[];
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
      {(!checkTwitchAuth() || !hasTwitchAuth) && (
        <div>
          <label>
            <button
              className="btn-sidebar bg-black bg-purple-700"
              onClick={() => (window.location.href = TWITCH_AUTH_URL)}
            >
              <FontAwesomeIcon icon={faTwitch} fixedWidth />
            </button>
            <span className="btn-txt">Connect to Twitch</span>
          </label>
        </div>
      )}
      {followedStreams.length ? (
        <>
          <hr />
          <div className="overflow-y-auto scrollbar-width-thin overflow-x-hidden py-2 bg-gray-900">
            {followedStreams.map(({ stream, user }) => (
              <FollowedStream
                isOpen={streamsLowercase.includes(
                  stream.userName.toLowerCase()
                )}
                isPrimary={stream.userName.toLowerCase() === primaryStream}
                stream={stream}
                user={user}
                addStream={addStream}
              />
            ))}
          </div>
          <hr className="mb-2" />
        </>
      ) : null}
      <div>
        <label>
          <button
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

function FollowedStream({ isPrimary, isOpen, stream, user, addStream }) {
  return (
    <div
      className={classNames(
        "bg-opacity-50",
        isPrimary && "bg-red-600",
        isOpen && !isPrimary && "bg-blue-800"
      )}
    >
      <label className="flex">
        <button
          className="btn-sidebar-followed w-8 flex-shrink-0"
          onClick={() => addStream(stream.userName)}
        >
          <img
            className={classNames("rounded-full")}
            src={user!.profileImageUrl}
            alt={stream.userName}
          />
        </button>
        <div className="btn-txt flex-grow flex flex-col">
          <div className="flex justify-between">
            <div className="sidebar-stream-name" title={stream.userName}>
              {stream.userName}
            </div>
            <div className="text-xs ml-auto mr-2 text-red-400">
              {stream.viewerCount}
            </div>
          </div>
          <div className="sidebar-stream-title" title={stream.title}>
            {stream.title}
          </div>
        </div>
      </label>
    </div>
  );
}
