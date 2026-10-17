import { act, renderHook } from "@testing-library/react";
import Cookies from "js-cookie";

import useStreams from "./useStreams";
import { handleTwitchAuthCallback } from "./twitch";
import { STREAM_STATE_COOKIE } from "./const";

function renderStreams(search = "") {
  const hook = renderHook(() => useStreams());
  // initial state is computed at module load, and the mount effect rewrites
  // the URL, so set the URL afterwards and re-read it
  window.history.replaceState({}, "", "/" + search);
  act(() => hook.result.current.dispatch({ type: "INIT" }));
  return hook;
}

beforeEach(() => {
  Cookies.remove(STREAM_STATE_COOKIE);
  document.location.hash = "";
});

test("first added stream becomes primary", () => {
  const { result } = renderStreams();
  act(() => result.current.actions.addStream("Foo"));
  expect(result.current.state.streams).toEqual(["foo"]);
  expect(result.current.state.primaryStreams).toEqual(["foo"]);
  expect(result.current.state.selectedChat).toBe("foo");
});

test("moving a primary stream past the end doesn't duplicate it", () => {
  const { result } = renderStreams("?streams=a,b,c&primary=a,b&layout=2");
  act(() => result.current.actions.setPrimaryStream("a", 2));
  expect(result.current.state.primaryStreams).toEqual(["b", "a"]);
});

test("moving a primary stream to an occupied slot swaps them", () => {
  const { result } = renderStreams("?streams=a,b,c&primary=a,b&layout=2");
  act(() => result.current.actions.setPrimaryStream("a", 1));
  expect(result.current.state.primaryStreams).toEqual(["b", "a"]);
});

test("stream state survives the Twitch auth redirect", async () => {
  const { result } = renderStreams("?streams=a,b,c&primary=a,b&layout=2");
  // the cookie is written in a setTimeout after the state effect runs
  await act(() => new Promise((resolve) => setTimeout(resolve)));
  expect(result.current.state.layout).toBe(2);

  document.location.hash = "#access_token=token";
  expect(handleTwitchAuthCallback()).toMatchObject({
    reloadFromAuthStreams: ["a", "b", "c"],
    reloadFromAuthPrimary: ["a", "b"],
    reloadFromAuthLayout: 2,
  });
});
