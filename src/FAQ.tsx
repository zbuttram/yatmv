export default function FaqModal() {
  return <></>;
}

function FAQ() {
  return (
    <>
      <A q="I often see a purple screen on Twitch streams that says I may be using an ad-blocker.">
        Twitch does this in place of ads on stream embeds. So you are seeing the
        purple screen instead of ads. You may{" "}
        <a target="_blank" rel="noreferrer" href="https://www.twitch.tv/subs">
          subscribe
        </a>{" "}
        to the channel(s) you are watching or purchase{" "}
        <a target="_blank" rel="noreferrer" href="https://www.twitch.tv/turbo">
          Twitch Turbo
        </a>{" "}
        to remove ads which also stops the purple screens.
      </A>
    </>
  );
}

function A({ q, children }) {
  return (
    <>
      <p>Q. {q}</p>
      <p>A. {children}</p>
    </>
  );
}
