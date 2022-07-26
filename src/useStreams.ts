import produce from "immer";
import { useEffect, useReducer } from "react";
import { usePrevious } from "react-use";
import invariant from "tiny-invariant";
import Cookies from "js-cookie";
import { uniq } from "lodash";

import { Layout } from "./layout";
import { STREAM_STATE_COOKIE } from "./const";
import { handleTwitchAuthCallback } from "./twitch";

export type StreamState = {
  streams: string[];
  primaryStreams: string[];
  layout: Layout;
  selectedChat: string;
};

function getInitialStreamState(): StreamState {
  const pageURL = new URL(window.location.href);
  let parsedUrlStreams: string[] = [];
  const urlStreams = pageURL.searchParams.get("streams");
  if (urlStreams) {
    parsedUrlStreams = urlStreams.split(",");
  }
  let parsedUrlPrimary: string[] = [];
  const urlPrimary = pageURL.searchParams.get("primary");
  if (urlPrimary) {
    parsedUrlPrimary = urlPrimary.split(",");
  }
  let parsedUrlLayout: Layout | undefined;
  const urlLayout = pageURL.searchParams.get("layout");
  if (urlLayout) {
    const num = Number(urlLayout);
    parsedUrlLayout = Number.isNaN(num) ? 0 : num;
  }

  let { reloadFromAuthStreams, reloadFromAuthPrimary, reloadFromAuthLayout } =
    handleTwitchAuthCallback();

  const layout = reloadFromAuthLayout || parsedUrlLayout || 0;
  let primaryStreams = uniq(reloadFromAuthPrimary || parsedUrlPrimary || []);

  const maxPrimary = layout + 1;
  if (primaryStreams.length > maxPrimary) {
    primaryStreams = primaryStreams.slice(0, layout + 1);
  }

  return {
    streams: uniq(reloadFromAuthStreams || parsedUrlStreams || []),
    primaryStreams,
    layout,
    selectedChat: primaryStreams[0],
  };
}

type StreamAction =
  | { type: "INIT" }
  | { type: "ADD_STREAM"; payload: string }
  | { type: "REMOVE_STREAM"; payload: number }
  | { type: "SET_PRIMARY"; payload: { stream: string; position: number } }
  | { type: "SET_LAYOUT"; payload: { layout: Layout } }
  | { type: "ROTATE_PRIMARY"; payload: { reverse: boolean } }
  | { type: "REPLACE_STREAM"; payload: { replace: string; with: string } }
  | { type: "SET_SELECTED_CHAT"; payload: { chat: string } };

const streamsReducer = produce(function produceStreams(
  draft: StreamState,
  action: StreamAction
) {
  const { streams, primaryStreams, layout } = draft;

  function setPrimaryStream(stream, position = 0) {
    const streamLower = stream.toLowerCase();
    if (layout === 0) {
      draft.primaryStreams = [streamLower];
    } else {
      const prevPosition = draft.primaryStreams.indexOf(streamLower);
      const removed = draft.primaryStreams.splice(position, 1, streamLower);
      if (prevPosition > -1 && removed[0]) {
        draft.primaryStreams[prevPosition] = removed[0];
      }
    }
  }

  switch (action.type) {
    case "INIT":
      Object.assign(draft, getInitialStreamState());
      break;
    case "SET_PRIMARY":
      setPrimaryStream(action.payload.stream, action.payload.position);
      draft.selectedChat = draft.primaryStreams[0];
      break;
    case "ADD_STREAM":
      if (
        streams
          .map((s) => s.toLowerCase())
          .includes(action.payload.toLowerCase())
      ) {
        setPrimaryStream(action.payload);
      } else {
        if (streams.length < 1) {
          setPrimaryStream(action.payload);
        }
        draft.streams.unshift(action.payload.toLowerCase());
      }
      break;
    case "REMOVE_STREAM":
      const removing = streams[action.payload];
      const primaryIndex = primaryStreams.indexOf(removing);
      if (primaryIndex !== -1) {
        draft.primaryStreams.splice(primaryIndex, 1);
      }
      draft.streams.splice(action.payload, 1);
      if (draft.primaryStreams.length === 0 && streams.length) {
        draft.primaryStreams = [streams[0]];
      }
      break;
    case "SET_LAYOUT":
      draft.layout = action.payload.layout;
      const maxPrimary = draft.layout + 1;
      if (draft.primaryStreams.length > maxPrimary) {
        draft.primaryStreams = draft.primaryStreams.slice(0, draft.layout + 1);
      }
      break;
    case "ROTATE_PRIMARY":
      if (draft.primaryStreams.length > 0) {
        const element = action.payload.reverse
          ? draft.primaryStreams.shift()
          : draft.primaryStreams.pop();
        invariant(!!element);
        action.payload.reverse
          ? draft.primaryStreams.push(element)
          : draft.primaryStreams.unshift(element);
        draft.selectedChat = draft.primaryStreams[0];
      }
      break;
    case "REPLACE_STREAM":
      if (draft.streams.includes(action.payload.with)) {
        draft.streams.splice(draft.streams.indexOf(action.payload.replace), 1);
      } else {
        draft.streams.splice(
          draft.streams.indexOf(action.payload.replace),
          1,
          action.payload.with
        );
      }
      if (draft.primaryStreams.includes(action.payload.replace)) {
        draft.primaryStreams.splice(
          draft.primaryStreams.indexOf(action.payload.replace),
          1,
          action.payload.with
        );
      }
      break;
    case "SET_SELECTED_CHAT":
      draft.selectedChat = action.payload.chat;
      break;
    default:
      throw new Error("Unknown action type in useStreams reducer");
  }
});

export default function useStreams() {
  const [state, dispatch] = useReducer(
    streamsReducer,
    { streams: [], primaryStreams: [], layout: 0, selectedChat: "" },
    (state) => streamsReducer(state, { type: "INIT" })
  );
  const prevState = usePrevious(state);
  const { streams, primaryStreams, layout } = state;

  // set URL params
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    streams && streams.length
      ? params.set("streams", streams.filter(Boolean).toString())
      : params.delete("streams");
    primaryStreams && primaryStreams.length
      ? params.set("primary", primaryStreams.toString())
      : params.delete("primary");
    layout !== 0
      ? params.set("layout", layout.toString())
      : params.delete("layout");

    url.search = params.toString();
    window.history.replaceState({}, window.document.title, url.toString());
    setTimeout(() => {
      Cookies.set(
        STREAM_STATE_COOKIE,
        JSON.stringify({
          streams,
          primaryStreams,
        })
      );
    });
  }, [streams, primaryStreams, layout]);

  return {
    state,
    prevState,
    dispatch,
    actions: {
      addStream(name: string) {
        dispatch({ type: "ADD_STREAM", payload: name });
      },
      removeStream(index: number) {
        dispatch({ type: "REMOVE_STREAM", payload: index });
      },
      setPrimaryStream(stream: string, position: number) {
        dispatch({ type: "SET_PRIMARY", payload: { stream, position } });
      },
      setLayout(layout: Layout) {
        dispatch({ type: "SET_LAYOUT", payload: { layout } });
      },
      rotatePrimary(reverse = false) {
        dispatch({ type: "ROTATE_PRIMARY", payload: { reverse } });
      },
      replaceStream(replace: string, replacement: string) {
        dispatch({
          type: "REPLACE_STREAM",
          payload: { replace, with: replacement },
        });
      },
      setSelectedChat(chat: string) {
        dispatch({
          type: "SET_SELECTED_CHAT",
          payload: { chat },
        });
      },
    },
  };
}
