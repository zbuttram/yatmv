import { act, renderHook } from "@testing-library/react";

import useStreams from "./useStreams";

/** Test helper: render useStreams with state read from the given URL search. */
export function renderStreams(search = "") {
  const hook = renderHook(() => useStreams());
  // initial state is computed at module load, and the mount effect rewrites
  // the URL, so set the URL afterwards and re-read it
  window.history.replaceState({}, "", "/" + search);
  act(() => hook.result.current.dispatch({ type: "INIT" }));
  return hook;
}
