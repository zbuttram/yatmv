import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";

import { useTwitchUser } from "./twitch";

export default function ChatSelector({
  setSelectedChat,
  toggleChatLock,
  resetSelectedChat,
  selectedChat,
  chatLocked,
  streams,
  primaryStreams,
}: {
  selectedChat?: string;
  chatLocked: boolean;
  streams: string[];
  primaryStreams: string[];
  setSelectedChat: (chat: string) => void;
  toggleChatLock: () => void;
  resetSelectedChat: () => void;
}) {
  const notOnDefaultChat = selectedChat !== primaryStreams[0];

  return (
    <div className="p-2 flex justify-center">
      <div
        className={classNames("mr-2 pl-1", notOnDefaultChat ? "" : "invisible")}
      >
        <button
          onClick={() => notOnDefaultChat && resetSelectedChat()}
          title="Reset to Default Chat"
        >
          <FontAwesomeIcon fixedWidth icon={faEye} />
        </button>
      </div>
      <select
        className="bg-black cursor-pointer"
        onChange={(e) => setSelectedChat(e.target.value)}
        value={selectedChat}
      >
        {streams.map((stream) => (
          <Option key={stream} stream={stream} />
        ))}
      </select>
      <div className="ml-2">
        <button onClick={toggleChatLock} title="Lock">
          <FontAwesomeIcon fixedWidth icon={chatLocked ? faLock : faLockOpen} />
        </button>
      </div>
    </div>
  );
}

function Option({ stream }: { stream: string }) {
  const { data: user } = useTwitchUser(stream.toLowerCase());

  return <option value={stream}>{user?.displayName ?? stream}</option>;
}
