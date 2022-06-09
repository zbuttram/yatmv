import { Dispatch, forwardRef, SetStateAction, useRef, useState } from "react";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCompressArrowsAlt,
  faExpandArrowsAlt,
  faTh,
  faUsers,
  faSyncAlt,
  faSliders,
} from "@fortawesome/free-solid-svg-icons";
import { faTwitch } from "@fortawesome/free-brands-svg-icons";
import { useClickAway } from "react-use";
import { range } from "lodash";

import { TWITCH_AUTH_URL } from "./const";
import { Settings } from "./useSettings";
import { checkTwitchAuth, StreamData, useTwitchUser } from "./twitch";
import useBounding from "./useBounding";
import { simplifyViewerCount } from "./utils";
import { Layout, MAX_LAYOUT } from "./layout";
import { SetModalFunc } from "./Modal";

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
  setModal,
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
  setModal: SetModalFunc;
}) {
  const { fullHeightPlayer, sidebarOpen } = settings;

  return (
    <div
      className={classNames(
        "sidebar flex flex-col",
        sidebarOpen ? "open w-56" : "w-16",
        className
      )}
    >
      <div className="self-end">
        <label>
          <span className="btn-txt">Collapse</span>
          <button
            title={sidebarOpen ? "Collapse" : "Expand"}
            className="px-2 py-1 mx-3 my-1"
            onClick={() =>
              setSettings((state) => ({
                ...state,
                sidebarOpen: !state.sidebarOpen,
              }))
            }
          >
            <FontAwesomeIcon
              icon={faArrowLeft}
              className={classNames(
                "transition-transform text-lg",
                !sidebarOpen && "flip-horizontal"
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
                  sidebarExpanded={sidebarOpen}
                />
              ))}
          </div>
          <hr className="mb-2" />
        </>
      ) : null}
      {checkTwitchAuth() ? (
        <SidebarButton
          title="Browse Twitch"
          bgColorClass="bg-purple-700"
          onClick={() => setModal("twitch-browser")}
          icon={<FontAwesomeIcon icon={faTwitch} fixedWidth />}
        />
      ) : (
        <SidebarButton
          title="Connect to Twitch"
          bgColorClass="bg-purple-700"
          onClick={() => (window.location.href = TWITCH_AUTH_URL)}
          icon={<FontAwesomeIcon icon={faTwitch} fixedWidth />}
        />
      )}
      <SidebarButton
        title="Settings"
        onClick={() => setModal("settings")}
        icon={<FontAwesomeIcon icon={faSliders} fixedWidth />}
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
    </div>
  );
}

function ChangeLayoutButton({ setLayout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickAway(ref, () => setDropdownOpen(false));

  return (
    <SidebarButton
      ref={ref}
      title="Change Layout"
      onClick={() => setDropdownOpen(true)}
      className="relative"
      icon={<FontAwesomeIcon fixedWidth icon={faTh} />}
      append={
        <div
          style={{ top: "50%", left: "50%" }}
          className={classNames(
            "absolute rounded bg-gray-900 z-20 border border-slate-400 overflow-y-auto",
            dropdownOpen ? "" : "hidden"
          )}
        >
          {range(MAX_LAYOUT + 1).map((layout) => (
            <div
              className={classNames(
                "cursor-pointer px-4 py-1 hover:bg-gray-700",
                layout === 0 && "rounded-t",
                layout === MAX_LAYOUT && "rounded-b"
              )}
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

type SidebarButtonProps = {
  bgColorClass?: string;
  className?: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  icon: React.ReactElement;
  append?: null | React.ReactElement;
};

const SidebarButton = forwardRef<HTMLDivElement, SidebarButtonProps>(
  function _SidebarButton(
    {
      bgColorClass,
      className,
      title,
      onClick,
      onMouseDown,
      onContextMenu,
      icon,
      append = null,
    },
    ref
  ) {
    return (
      <div className={className} ref={ref}>
        <label className="flex flex-row-reverse">
          <button
            title={title}
            className={classNames("btn-sidebar", bgColorClass ?? "bg-black")}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onContextMenu={onContextMenu}
          >
            {icon}
          </button>
          <div className="btn-txt">{title}</div>
        </label>
        {append}
      </div>
    );
  }
);

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
    <div className={classNames("max-h-24 overflow-ellipsis")}>
      {stream.title}
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
          <div className="flex flex-col text-sm max-w-xs">
            <div className="text-purple-500">
              {stream.userName}
              {stream.gameName && <> &#183; {stream.gameName}</>}
            </div>
            {streamTitle}
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
