import produce from "immer";
import { useReducer } from "react";
import { usePrevious } from "react-use";
import invariant from "tiny-invariant";
import { Layout, MAX_LAYOUT } from "./layout";

export type StreamState = {
  streams: string[];
  primaryStreams: string[];
  layout: Layout;
};

type StreamAction =
  | { type: "ADD_STREAM"; payload: string }
  | { type: "REMOVE_STREAM"; payload: number }
  | { type: "SET_PRIMARY"; payload: { stream: string; position: number } }
  | { type: "TOGGLE_LAYOUT"; payload: { reverse: boolean } }
  | { type: "ROTATE_PRIMARY"; payload: { reverse: boolean } };

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
    case "TOGGLE_LAYOUT":
      if (action.payload.reverse) {
        const next = draft.layout - 1;
        draft.layout = next < 0 ? MAX_LAYOUT : next;
      } else {
        const next = draft.layout + 1;
        draft.layout = next > MAX_LAYOUT ? 0 : next;
      }
      break;
    case "ROTATE_PRIMARY":
      if (draft.primaryStreams.length > 0) {
        const element = action.payload.reverse
          ? draft.primaryStreams.pop()
          : draft.primaryStreams.shift();
        invariant(!!element);
        action.payload.reverse
          ? draft.primaryStreams.unshift(element)
          : draft.primaryStreams.push(element);
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
  const [state, dispatch] = useReducer(streamsReducer, init);
  const prevState = usePrevious(state);

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
      toggleLayout(reverse = false) {
        dispatch({ type: "TOGGLE_LAYOUT", payload: { reverse } });
      },
      cyclePrimary(reverse = false) {
        dispatch({ type: "ROTATE_PRIMARY", payload: { reverse } });
      },
    },
  };
}
