import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";

import { useTwitchUser } from "./twitch";
import { StreamState } from "./useStreams";

export default function ChatSelector({
  streamState,
  setSelectedChat,
  toggleChatLock,
}: {
  streamState: StreamState;
  setSelectedChat: (chat: string) => void;
  toggleChatLock: () => void;
}) {
  const { selectedChat, streams, chatLocked, primaryStreams } = streamState;

  const notOnDefaultChat = selectedChat !== primaryStreams[0];

  return (
    <div className="p-2 flex justify-center">
      <div className={classNames("mr-2", notOnDefaultChat ? "" : "invisible")}>
        <button
          onClick={() => {
            if (notOnDefaultChat) {
              setSelectedChat(primaryStreams[0]);
            }
          }}
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
