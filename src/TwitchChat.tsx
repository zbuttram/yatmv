import { useContext, useEffect, useState } from "react";
import { AppContext } from "./appContext";

export default function TwitchChat({
  channel,
  className,
  replaceStream,
}: {
  channel: string;
  className: string;
  replaceStream: (replace: string, replacement: string) => void;
}) {
  const { chatService } = useContext(AppContext);
  const [hostTarget, setHostTarget] = useState<string | null>(null);

  useEffect(() => {
    if (chatService) {
      return chatService.on("hosting", ({ channel: eventChannel, target }) => {
        if (channel === eventChannel) {
          setHostTarget(target);
        }
      });
    }
  }, [channel, chatService]);

  return (
    <div className={className}>
      {hostTarget ? (
        <div className="h-full w-full flex justify-center items-center">
          <p>
            <span className="font-semibold">{channel}</span> has hosted{" "}
            <button
              className="underline font-semibold"
              onClick={() => replaceStream(channel, hostTarget)}
            >
              {hostTarget}
            </button>
          </p>
        </div>
      ) : (
        <iframe
          title="Twitch Chat"
          src={`https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=${window.location.hostname}`}
          height="100%"
          width="100%"
        />
      )}
    </div>
  );
}
