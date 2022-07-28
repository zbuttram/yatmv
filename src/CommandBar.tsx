import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import Log, { setLog } from "./log";

export default function CommandBar({
  open,
  close,
  isOpen,
}: {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}) {
  const id = "command-bar-input";

  useEffect(() => {
    function keyComboListener(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && event.code === "KeyZ") {
        open();
        document.getElementById(id)?.focus();
      }
    }
    document.addEventListener("keyup", keyComboListener);
    return () => document.removeEventListener("keyup", keyComboListener);
  }, [open]);

  const [command, setCommand] = useState("");
  const [keyLog, setKeyLog] = useState(false);

  function handleCommand() {
    const tokens = command.split(" ");
    Log("command-bar-tokens", { tokens });
    switch (tokens[0]) {
      case "devlog":
        if (tokens[1] === "on") {
          setLog(true);
          Log("Logging ON");
        } else if (tokens[1] === "off") {
          Log("Logging OFF");
          setLog(false);
        }
        break;
      case "keylog":
        if (tokens[1] === "on") {
          setKeyLog(true);
          Log("Command Bar Key Logging ON");
        } else if (tokens[1] === "off") {
          Log("Command Bar Key Logging OFF");
          setKeyLog(false);
        }
        break;
    }
    setCommand("");
  }

  return (
    <Modal
      backdrop={false}
      isOpen={isOpen}
      close={close}
      showCloseButton={false}
      height="3rem"
      width="40%"
    >
      <input
        id={id}
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        className="bg-black text-3xl w-full h-full p-1"
        placeholder="Type a command..."
        onKeyUp={(e) => {
          if (e.code === "Escape") {
            setCommand("");
            close();
          }
          if (e.code === "Enter") {
            handleCommand();
          }
          if (keyLog) {
            Log("command-bar-keyup", e.code);
          }
        }}
      />
    </Modal>
  );
}
