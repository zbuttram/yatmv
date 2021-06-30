function makeDefaultConverter<T>(converter: (x: any) => T) {
  return function defaultWithConverter(val, defaultVal): T {
    return val ? converter(val) : defaultVal;
  };
}

export const numDefault = makeDefaultConverter(Number);

export function epoch(diff: number = 0) {
  return Math.floor(Date.now() / 1000) + diff;
}
