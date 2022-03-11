import invariant from "tiny-invariant";
import { memoize } from "lodash";

export type Layout = number;

type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;

// max layout is max number of streams to allow in layouts minus 1
export const MAX_LAYOUT = 7;

const mapIndexWithOffset =
  (offset?: number) =>
  (_, i: number): number =>
    offset ? i + offset : i;

const getLayoutRows = memoize(function _getLayoutRows(
  layout: Layout
): [number[], number[]] {
  invariant(layout !== 0);

  const maxStreams = layout + 1;
  const remainder = maxStreams % 2;
  const firstRowLength = (maxStreams - remainder) / 2;

  return [
    Array(firstRowLength).fill(null).map(mapIndexWithOffset()),
    Array((maxStreams - remainder) / 2 + remainder)
      .fill(null)
      .map(mapIndexWithOffset(firstRowLength)),
  ];
});

const getOffset = memoize(
  function _getOffset(rect: Rect, layout: Layout, position: Layout): Rect {
    invariant(layout !== 0);

    const rows = getLayoutRows(layout);
    const rowIndex = rows.findIndex((r) => r.includes(position));
    const row = rows[rowIndex];
    const colIndex = row.findIndex((col) => col === position);

    let top: number = rect.top,
      left: number = rect.left,
      height: number = rect.height / rows.length,
      width: number = rect.width / row.length;

    if (rowIndex > 0) {
      top = top + height * rowIndex;
    }
    if (colIndex > 0) {
      left = left + width * colIndex;
    }

    return { top, left, width, height };
  },
  (rect, layout, position) =>
    [rect.height, rect.width, rect.top, rect.left, layout, position].join(",")
);

export function getPrimarySubRect(
  position: Layout,
  layout: Layout,
  bigRect: Partial<DOMRect>
) {
  if (layout === 0) {
    return bigRect;
  }

  const { top, left, width, height } = bigRect;
  if (
    top === undefined ||
    left === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return undefined;
  }

  return getOffset(bigRect as Rect, layout, position);
}
