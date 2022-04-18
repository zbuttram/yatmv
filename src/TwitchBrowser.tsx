import { Modal, ModalProps } from "./Modal";
import { StreamData } from "./twitch";
import classNames from "classnames";
import { ReactNode, useState } from "react";
import { simplifyViewerCount } from "./utils";
import { faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
      <div className="p-4">
        <h3 className="text-2xl font-semibold">Twitch Browser</h3>
        <div className="flex">
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
      <div
        className="border-t border-gray-400 py-2 overflow-y-auto"
        style={{ maxHeight: "800px" }}
      >
        {tab === "followed" ? (
          <div className="flex flex-wrap gap-3 justify-center">
            {followedStreams?.map((stream) => (
              <div className="w-1/5">
                <img
                  className="cursor-pointer"
                  onClick={() => addNewStream(stream.userLogin)}
                  src={stream.thumbnailUrl
                    .replace("{width}", "440")
                    .replace("{height}", "248")}
                  alt={`thumbnail-${stream.userLogin}`}
                />
                <div className="flex">
                  <h3 className="font-semibold">{stream.userName}</h3>
                  <div className="flex-grow" />
                  <div className="text-sm text-right my-auto mr-1 text-red-400 whitespace-nowrap">
                    {simplifyViewerCount(stream.viewerCount)}{" "}
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                </div>
                <div
                  className={classNames("text-xs truncate")}
                  title={stream.title}
                >
                  {stream.title}
                </div>
              </div>
            ))}
          </div>
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
