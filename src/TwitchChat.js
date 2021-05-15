export default function TwitchChat({ channel, className }) {
  return (
    <iframe
      title="Twitch Chat"
      className={className}
      src={`https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=${window.location.hostname}`}
      height="100%"
      width="100%"
    />
  );
}
