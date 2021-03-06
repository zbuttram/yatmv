import { round } from "lodash";

function makeDefaultConverter<T>(converter: (x: any) => T) {
  return function defaultWithConverter(val, defaultVal): T {
    return val ? converter(val) : defaultVal;
  };
}

export const numDefault = makeDefaultConverter(Number);

export function epoch(diff: number = 0) {
  return Math.floor(Date.now() / 1000) + diff;
}

export function simplifyViewerCount(viewerCount) {
  if (viewerCount < 1000) {
    return viewerCount;
  } else {
    return round(viewerCount / 1000, viewerCount < 100000 ? 1 : 0) + "k";
  }
}
