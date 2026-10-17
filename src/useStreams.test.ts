import { act } from "@testing-library/react";
import Cookies from "js-cookie";

import { renderStreams } from "./renderStreams";
import { STREAM_STATE_COOKIE } from "./const";

beforeEach(() => {
  Cookies.remove(STREAM_STATE_COOKIE);
});

test("first added stream becomes primary", () => {
  const { result } = renderStreams();
  act(() => result.current.actions.addStream("Foo"));
  expect(result.current.state.streams).toEqual(["foo"]);
  expect(result.current.state.primaryStreams).toEqual(["foo"]);
  expect(result.current.state.selectedChat).toBe("foo");
});

test("adding another stream leaves the primary stream alone", () => {
  const { result } = renderStreams("?streams=a&primary=a");
  act(() => result.current.actions.addStream("b"));
  expect(result.current.state.streams).toEqual(["b", "a"]);
  expect(result.current.state.primaryStreams).toEqual(["a"]);
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

test.each(["8", "-1", "1.5", "x"])(
  "an invalid layout in the URL (%s) falls back to 0",
  (layout) => {
    const { result } = renderStreams(`?streams=a&layout=${layout}`);
    expect(result.current.state.layout).toBe(0);
  }
);
