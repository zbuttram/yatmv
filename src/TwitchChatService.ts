import tmi from "tmi.js";
import mitt, { Emitter, WildcardHandler } from "mitt";

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
    callback: (channel: string, target: string, viewers: number) => void
  );
  join(channel: string): Promise<void>;
  part(channel: string): Promise<void>;
  getChannels(): string[];
};

type ChatEvents = {
  message: { channel: string; tags: TmiTags; message: string };
  notice: { channel: string; msgid: string; message: string };
  hosting: { channel: string; target: string; viewers: number };
};

type ChatEventEmitter = Emitter<ChatEvents>;

class TwitchChatService {
  client: TmiClient;
  connected: boolean = false;
  emitter: ChatEventEmitter;

  constructor(streams: string[]) {
    this.client = new tmi.Client({
      channels: streams,
    });
    this.client.connect().then(() => (this.connected = true));
    this.emitter = mitt();
    this._setupEvents(this.emitter);
  }

  _setupEvents(emitter: ChatEventEmitter) {
    // this.client.on("message", (channel: string, tags, message: string) => {
    //   emitter.emit("message", { channel: this._cleanChannel(channel), tags, message });
    // });
    this.client.on("notice", (channel, msgid, message) => {
      emitter.emit("notice", {
        channel: this._cleanChannel(channel),
        msgid,
        message,
      });
    });
    this.client.on("hosting", (channel, target, viewers) => {
      emitter.emit("hosting", {
        channel: this._cleanChannel(channel),
        target,
        viewers,
      });
    });
  }

  _cleanChannel(channel: string) {
    return channel.replace("#", "");
  }

  join(channel: string) {
    this.client.join(channel).then(() => {
      console.log("YATMV", "channel-join", channel);
    });
  }

  part(channel: string) {
    this.client.part(channel).then(() => {
      console.log("YATMV", "channel-part", channel);
    });
  }

  get channels() {
    return this.client.getChannels().map(this._cleanChannel);
  }

  set channels(channels) {
    if (!this.connected) {
      return;
    }
    const current = this.channels;
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

  on<Key extends keyof ChatEvents>(
    type: Key,
    handler: (event: ChatEvents[Key]) => void
  ): () => void;
  on(type: "*", handler: WildcardHandler<ChatEvents>);
  on(type, handler) {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }
}

let ChatService;
export function getChatService(streams: string[]) {
  if (!ChatService) {
    ChatService = new TwitchChatService(streams);
  }
  return ChatService;
}
