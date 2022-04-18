import { round, snakeCase } from "lodash";

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

export type ParamValue = number | string | string[] | boolean | undefined;
export type Params = Record<string, ParamValue>;

export function paramsToString(params?: Params): string {
  if (!params) {
    return "";
  } else {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (!v) {
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((e) => search.append(snakeCase(k), e));
      } else {
        search.append(snakeCase(k), v.toString());
      }
    });
    return search.toString();
  }
}

const thumbnailCache = new Map();
export function sizeThumbnailUrl({
  url,
  width,
  height,
}: {
  url: string;
  width: string;
  height: string;
}) {
  const key = [url, width, height].join(",");
  if (thumbnailCache.has(key)) {
    return thumbnailCache.get(key);
  } else {
    const sized = url.replace("{width}", width).replace("{height}", height);
    thumbnailCache.set(key, sized);
    return sized;
  }
}
