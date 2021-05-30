const Log =
  process.env.NODE_ENV === "development"
    ? (...args) => console.log("YATMV-DEV", ...args)
    : () => {};

export default Log;
