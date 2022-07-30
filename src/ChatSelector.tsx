import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faLockOpen } from "@fortawesome/free-solid-svg-icons";

export default function ChatSelector(props: {
  selectedChat: any;
  showChat: boolean;
  onChange: (e) => void;
  streams: any;
  onClick: () => void;
  chatLocked: any;
}) {
  return (
    <div className="p-2 flex justify-center">
      <select
        className={classNames(
          "bg-black cursor-pointer",
          props.selectedChat && props.showChat ? "" : "w-0"
        )}
        onChange={props.onChange}
        value={props.selectedChat}
      >
        {props.streams.map((stream) => (
          <option value={stream}>{stream}</option>
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
