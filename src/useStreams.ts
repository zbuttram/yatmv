import produce from "immer";
import { useEffect, useReducer } from "react";
import { usePrevious } from "react-use";
import invariant from "tiny-invariant";
import { Layout } from "./layout";
import Cookies from "js-cookie";
import { STREAM_STATE_COOKIE } from "./const";

export type StreamState = {
  streams: string[];
  primaryStreams: string[];
  layout: Layout;
};

type StreamAction =
  | { type: "INIT" }
  | { type: "ADD_STREAM"; payload: string }
  | { type: "REMOVE_STREAM"; payload: number }
  | { type: "SET_PRIMARY"; payload: { stream: string; position: number } }
  | { type: "SET_LAYOUT"; payload: { layout: Layout } }
  | { type: "ROTATE_PRIMARY"; payload: { reverse: boolean } }
  | { type: "REPLACE_STREAM"; payload: { replace: string; with: string } };

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
      break;
    case "SET_PRIMARY":
      setPrimaryStream(action.payload.stream, action.payload.position);
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
    default:
      throw new Error("Unknown action type in useStreams reducer");
  }

  const maxPrimary = draft.layout + 1;
  const unusedPrimarySlots = maxPrimary - draft.primaryStreams.length;

  if (draft.primaryStreams.length > maxPrimary) {
    draft.primaryStreams = draft.primaryStreams.slice(0, draft.layout + 1);
  } else if (unusedPrimarySlots > 0) {
    const unusedStreams = draft.streams.filter(
      (s) => !primaryStreams.includes(s)
    );
    if (unusedStreams.length) {
      primaryStreams.push(...unusedStreams.slice(0, unusedPrimarySlots));
    }
  }
});

export default function useStreams(init: StreamState) {
  const [state, dispatch] = useReducer(streamsReducer, init, (state) =>
    streamsReducer(state, { type: "INIT" })
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
    },
  };
}
