export default function TwitchChat({ channel }) {
  return (
    <iframe
      title="Twitch Chat"
      src={`https://www.twitch.tv/embed/${channel}/chat?darkpopout&parent=${window.location.hostname}`}
      height="100%"
      width="100%"
    />
  );
}
