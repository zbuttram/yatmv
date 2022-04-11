import classNames from "classnames";

export default function TwitchChat({
  channel,
  className,
  replaceStream,
  hostTarget,
  isDisplayed,
}: {
  channel: string;
  className?: string;
  replaceStream: (replace: string, replacement: string) => void;
  hostTarget?: string;
  isDisplayed: boolean;
}) {
  return (
    <div
      className={classNames(
        className,
        isDisplayed ? "chat-standard-width" : "w-0",
        "transition-all"
      )}
    >
      {hostTarget ? (
        <div
          className={classNames(
            "h-full w-full flex justify-center items-center",
            isDisplayed ? undefined : "hidden"
          )}
        >
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
          title={`${channel}'s chat`}
          src={`https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=${window.location.hostname}`}
          height="100%"
          width="100%"
        />
      )}
    </div>
  );
}
