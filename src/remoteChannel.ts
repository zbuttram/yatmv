const channel = new BroadcastChannel("yatmv-remote");

type RemoteNegotiationData = { type: "ping" } | { type: "pong" };
type RemoteActionData = { type: "AddStream"; payload: { stream: string } };
type RemoteData = RemoteActionData | RemoteNegotiationData;
type RemoteEvent = MessageEvent<RemoteData>;

function postMessage(data: RemoteData) {
  channel.postMessage(data);
}

function onMessageType(
  type: RemoteData["type"],
  callback: (evt?: RemoteActionData["payload"]) => void
) {
  const filter = (evt: RemoteEvent) => {
    if (evt.data.type === type) {
      if (evt.data.type === "ping" || evt.data.type === "pong") {
        callback();
      } else {
        callback(evt.data.payload);
      }
    }
  };
  channel.addEventListener("message", filter);
  return () => channel.removeEventListener("message", filter);
}

let isLeader = false;
export function setupAsRemoteLeader() {
  if (isLeader) {
    return;
  }
  isLeader = true;
  onMessageType("ping", () => postMessage({ type: "pong" }));
}

export function onAddStreamRequest(callback) {
  return onMessageType("AddStream", (payload) => callback(payload?.stream));
}

export function waitForLeader(timeout = 5000) {
  return new Promise<void>((resolve, reject) => {
    let didPong = false;

    const stop = onMessageType("pong", () => {
      didPong = true;
      stop();
      resolve();
    });

    postMessage({ type: "ping" });

    setTimeout(() => {
      if (!didPong) {
        stop();
        reject();
      }
    }, timeout);
  });
}

export async function addRemoteStream(stream) {
  await waitForLeader();
  postMessage({ type: "AddStream", payload: { stream } });
}
