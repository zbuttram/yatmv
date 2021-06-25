function makeDefaultConverter<T>(converter: (x: any) => T) {
  return function defaultWithConverter(val, defaultVal): T {
    return val ? converter(val) : defaultVal;
  };
}

export const numDefault = makeDefaultConverter(Number);
