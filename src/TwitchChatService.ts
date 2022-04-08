import tmi from "tmi.js";
import Log from "./log";

// needs better defining
type TmiTags = Record<string, any>;

type TmiClient = {
  connect(): Promise<void>;
  on(
    event: "message",
    callback: (channel: string, tags: TmiTags, message: string) => void
  );
  on(
    event: "notice",
    callback: (channel: string, msgid: string, message: string) => void
  );
  on(
    event: "hosting",
    callback: (channe: string, target: string, viewers: number) => void
  );
  join(channel: string): Promise<void>;
  part(channel: string): Promise<void>;
  getChannels(): string[];
};

export class TwitchChatService {
  client: TmiClient;
  connected: boolean = false;

  constructor(streams: string[]) {
    this.client = new tmi.Client({
      channels: streams,
    });
    this.client.connect().then(() => (this.connected = true));
    // this.client.on("message", (channel: string, tags, message: string) => {
    //   Log(
    //     "channel-message",
    //     `|${channel}| [${tags["display-name"]}] ${message}`,
    //     { tags }
    //   );
    // });
    this.client.on("notice", (channel, msgid, message) => {
      console.log("YATMV", "channel-notice", { channel, msgid, message });
    });
    this.client.on(
      "hosting",
      (channel: string, target: string, viewers: number) => {
        console.log("YATMV", "channel-hosting", { channel, target, viewers });
      }
    );
  }

  join(channel: string) {
    this.client
      .join(channel)
      .then(() => console.log("YATMV", "channel-join", channel));
  }

  part(channel: string) {
    this.client
      .part(channel)
      .then(() => console.log("YATMV", "channel-part", channel));
  }

  get channels() {
    return this.client.getChannels();
  }

  set channels(channels) {
    if (!this.connected) {
      return;
    }
    const current = this.channels.map((c) => c.replace("#", ""));
    channels.forEach((c) => {
      if (!current.includes(c)) {
        this.join(c);
      }
    });
    current.forEach((c) => {
      if (!channels.includes(c)) {
        this.part(c);
      }
    });
  }
}
