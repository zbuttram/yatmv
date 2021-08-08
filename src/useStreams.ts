import produce from "immer";
import { useReducer } from "react";

export enum Layouts {
  OneUp,
  TwoUp,
  ThreeUp,
  FourUp,
}

type StreamState = {
  streams: string[];
  primaryStreams: string[];
  layout: Layouts;
};

type StreamAction =
  | { type: "ADD_STREAM"; payload: string }
  | { type: "REMOVE_STREAM"; payload: number };

const streamsReducer = produce(function produceStreams(
  draft: StreamState,
  action: StreamAction
) {
  const { streams, primaryStreams, layout } = draft;

  function setPrimaryStream(stream) {
      
    draft.primaryStreams.push(stream);
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
        draft.streams.unshift(action.payload);
      }
      break;
    case "REMOVE_STREAM":
        const removing = streams[action.payload]
        const primaryIndex = primaryStreams.indexOf(removing)
        if () {

        }
      if (
        streams.findIndex((s) => primaryStreams.includes(s.toLowerCase())) ===
        index
      ) {
        const newPrimary = streams[index + (index === 0 ? 1 : -1)];
        setPrimaryStream(newPrimary ? newPrimary : undefined);
      }
      setStreams(
        produce((draft) => {
          draft.splice(index, 1);
        })
      );
      break;
    default:
    //nothing
  }
});

// const removeStream = useCallback(
//   function removeStream(index: number) {
//     if (
//       streams.findIndex((s) => s.toLowerCase() === primaryStreamNames) ===
//       index
//     ) {
//       const newPrimary = streams[index + (index === 0 ? 1 : -1)];
//       setPrimaryStream(newPrimary ? newPrimary : undefined);
//     }
//     setStreams(
//       produce((draft) => {
//         draft.splice(index, 1);
//       })
//     );
//   },
//   [primaryStreamNames, setPrimaryStream, streams]
// );

export default function useStreams(init: StreamState) {
  const [state, dispatch] = useReducer(streamsReducer, init);

  return [
    state,
    {
      dispatch,
      addStream(name: string) {
        dispatch({ type: "ADD_STREAM", payload: name });
      },
    },
  ];
}
