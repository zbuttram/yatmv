import tmi from "tmi.js";
import Log from "./log";

export class TwitchChatService {
  client: any;
  connected: boolean = false;

  constructor(streams: string[]) {
    this.client = new tmi.Client({
      channels: streams,
    });
    this.client.connect().then(() => (this.connected = true));
    this.client.on("message", (channel: string, tags, message: string) => {
      Log(
        "channel-message",
        `|${channel}| [${tags["display-name"]}] ${message}`,
        { tags }
      );
    });
    this.client.on("notice", (channel, msgid, message) => {
      Log("channel-notice", { channel, msgid, message });
    });
    this.client.on(
      "hosting",
      (channel: string, target: string, viewers: number) => {
        Log("channel-hosting", { channel, target, viewers });
      }
    );
  }

  join(channel: string) {
    this.client.join(channel).then(() => Log("channel-join", channel));
  }

  part(channel: string) {
    this.client.part(channel).then(() => Log("channel-part", channel));
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
