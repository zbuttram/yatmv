import produce from "immer";
import { useReducer } from "react";

export enum Layout {
  OneUp,
  TwoUp,
  ThreeUp,
  FourUp,
}

type StreamState = {
  streams: string[];
  primaryStreams: string[];
  layout: Layout;
};

type StreamAction =
  | { type: "ADD_STREAM"; payload: string }
  | { type: "REMOVE_STREAM"; payload: number };

const streamsReducer = produce(function produceStreams(
  draft: StreamState,
  action: StreamAction
) {
  const { streams, primaryStreams, layout } = draft;

  function setPrimaryStream(stream, position = 0) {
    if (layout === Layout.OneUp) {
      draft.primaryStreams = [stream.toLowerCase()];
    } else {
      draft.primaryStreams.splice(position, 1, stream.toLowerCase());
    }
  }

  switch (action.type) {
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
      break;
    default:
    //nothing
  }
});

export default function useStreams(init: StreamState) {
  const [state, dispatch] = useReducer(streamsReducer, init);

  return {
    state,
    dispatch,
    addStream(name: string) {
      dispatch({ type: "ADD_STREAM", payload: name });
    },
    removeStream(index: number) {
      dispatch({ type: "REMOVE_STREAM", payload: index });
    },
  };
}
