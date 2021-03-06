import { Dispatch, SetStateAction, useRef, useState } from "react";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCompressArrowsAlt,
  faExpandArrowsAlt,
  faRocket,
  faTachometerAlt,
  faTh,
  faUsers,
  faSyncAlt,
} from "@fortawesome/free-solid-svg-icons";
import LinesEllipsis from "react-lines-ellipsis";
import { faGithub, faTwitch } from "@fortawesome/free-brands-svg-icons";

import { PROJECT_URL, TWITCH_AUTH_URL } from "./const";
import { Settings } from "./useSettings";
import { checkTwitchAuth, StreamData, useTwitchUser } from "./twitch";
import useBounding from "./useBounding";
import { simplifyViewerCount } from "./utils";
import { useClickAway } from "react-use";
import { range } from "lodash";
import { Layout, MAX_LAYOUT } from "./layout";

export function Sidebar({
  className,
  settings,
  setSettings,
  streams,
  primaryStreams,
  followedStreams,
  addStream,
  rotatePrimary,
  setLayout,
}: {
  className?: string;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
  followedStreams?: StreamData[];
  streams: string[];
  primaryStreams: string[];
  addStream: (streamName: string) => void;
  rotatePrimary: (reverse?: boolean) => void;
  setLayout: (layout: Layout) => void;
}) {
  const { boostMode, fullHeightPlayer } = settings;
  const [open, setOpen] = useState(false);

  return (
    <div
      className={classNames(
        "sidebar flex flex-col",
        open ? "open w-56" : "w-16",
        className
      )}
    >
      <div className="self-end">
        <label>
          <span className="btn-txt">Collapse</span>
          <button
            title={open ? "Collapse" : "Expand"}
            className="px-2 py-1 mx-3 my-1"
            onClick={() => setOpen((state) => !state)}
          >
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={classNames(
                "transition-transform text-lg",
                !open && "flip-horizontal"
              )}
              fixedWidth
            />
          </button>
        </label>
      </div>
      {followedStreams?.length && followedStreams.length > 0 ? (
        <>
          <hr />
          <div className="overflow-y-auto scrollbar-width-thin overflow-x-hidden bg-gray-900">
            {followedStreams
              .filter((s) => !!s.userName)
              .map((stream) => (
                <FollowedStream
                  key={stream.userId}
                  isOpen={streams.includes(stream.userName.toLowerCase())}
                  isPrimary={primaryStreams.includes(
                    stream.userName.toLowerCase()
                  )}
                  stream={stream}
                  addStream={addStream}
                  sidebarExpanded={open}
                />
              ))}
          </div>
          <hr className="mb-2" />
        </>
      ) : null}
      {!checkTwitchAuth() && (
        <SidebarButton
          title="Connect to Twitch"
          bgColorClass="bg-purple-700"
          onClick={() => (window.location.href = TWITCH_AUTH_URL)}
          icon={<FontAwesomeIcon icon={faTwitch} fixedWidth />}
        />
      )}
      <SidebarButton
        title={(boostMode ? "Disable" : "Enable") + " Boost Mode"}
        onClick={() =>
          setSettings(({ boostMode, ...state }) => ({
            ...state,
            boostMode: !boostMode,
          }))
        }
        icon={
          <div className="fa-layers fa-fw">
            <FontAwesomeIcon icon={boostMode ? faTachometerAlt : faRocket} />
          </div>
        }
      />
      <SidebarButton
        title={fullHeightPlayer ? "Shrink Player" : "Full-Height Player"}
        onClick={() =>
          setSettings(({ fullHeightPlayer, ...state }) => ({
            ...state,
            fullHeightPlayer: !fullHeightPlayer,
          }))
        }
        icon={
          fullHeightPlayer ? (
            <FontAwesomeIcon icon={faCompressArrowsAlt} fixedWidth />
          ) : (
            <FontAwesomeIcon icon={faExpandArrowsAlt} fixedWidth />
          )
        }
      />
      <ChangeLayoutButton setLayout={setLayout} />
      {primaryStreams.length > 1 && (
        <SidebarButton
          title="Rotate Streams"
          onClick={() => rotatePrimary()}
          onMouseDown={(e) => {
            if (e.button === 2) {
              e.preventDefault();
              rotatePrimary(true);
              return false;
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            return false;
          }}
          icon={<FontAwesomeIcon fixedWidth icon={faSyncAlt} />}
        />
      )}
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

function ChangeLayoutButton({ setLayout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownLocation, setDropdownLocation] = useState({});

  return (
    <SidebarButton
      title="Change Layout"
      onClick={(e) => {
        setDropdownLocation({ left: e.clientX, top: e.clientY });
        setDropdownOpen(true);
      }}
      onClickAway={() => setDropdownOpen(false)}
      className="relative"
      icon={<FontAwesomeIcon fixedWidth icon={faTh} />}
      append={
        <div
          style={dropdownLocation}
          className={classNames(
            "fixed rounded bg-gray-900 z-20",
            dropdownOpen ? "" : "hidden"
          )}
        >
          {range(0, MAX_LAYOUT).map((layout) => (
            <div
              className="cursor-pointer px-4 py-1 hover:bg-gray-700"
              onClick={() => {
                setLayout(layout);
                setDropdownOpen(false);
              }}
              key={layout}
            >
              {layout + 1}-up
            </div>
          ))}
        </div>
      }
    />
  );
}

function SidebarButton({
  bgColorClass,
  className,
  title,
  onClick,
  onClickAway = () => {},
  onMouseDown,
  onContextMenu,
  icon,
  append = null,
}: {
  bgColorClass?: string;
  className?: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  onClickAway?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  icon: React.ReactElement;
  append?: null | React.ReactElement;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickAway(ref, onClickAway);

  return (
    <div className={className} ref={ref}>
      <label>
        <button
          title={title}
          className={classNames("btn-sidebar", bgColorClass ?? "bg-black")}
          onClick={onClick}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
        >
          {icon}
        </button>
        <span className="btn-txt">{title}</span>
      </label>
      {append}
    </div>
  );
}

function FollowedStream({
  isPrimary,
  isOpen,
  stream,
  addStream,
  sidebarExpanded,
}: {
  isPrimary: boolean;
  isOpen: boolean;
  stream: StreamData;
  addStream: (name: string) => void;
  sidebarExpanded: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const id = "followed-stream-" + stream.userId;
  const rect = useBounding(id);

  const { data: user } = useTwitchUser(stream.userLogin.toLowerCase());

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
              <div className="text-xs text-right ml-auto mr-2 text-red-400 whitespace-nowrap">
                {simplifyViewerCount(stream.viewerCount)}{" "}
                <FontAwesomeIcon icon={faUsers} />
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
              {simplifyViewerCount(stream.viewerCount)}{" "}
              <FontAwesomeIcon icon={faUsers} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
