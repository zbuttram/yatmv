import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";

import { useTwitchUser } from "./twitch";

export default function ChatSelector(props: {
  selectedChat?: string;
  showChat: boolean;
  onChange: (e) => void;
  streams: string[];
  onClick: () => void;
  chatLocked: boolean;
}) {
  return (
    <div className="p-2 flex justify-center">
      <select
        className="bg-black cursor-pointer"
        onChange={props.onChange}
        value={props.selectedChat}
      >
        {props.streams.map((stream) => (
          <Option key={stream} stream={stream} />
        ))}
      </select>
      <div className="ml-2">
        <button onClick={props.onClick}>
          <FontAwesomeIcon icon={props.chatLocked ? faLock : faLockOpen} />
        </button>
      </div>
    </div>
  );
}

function Option({ stream }: { stream: string }) {
  const { data: user } = useTwitchUser(stream.toLowerCase());

  return <option value={stream}>{user?.displayName ?? stream}</option>;
}
