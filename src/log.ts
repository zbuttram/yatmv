let shouldLog = process.env.NODE_ENV === "development";

export default function Log(...args) {
  if (!shouldLog) return;
  console.log("YATMV-DEV", ...args);
}

export function setLog(bool: boolean | null = null) {
  if (bool === null) {
    shouldLog = !shouldLog;
  } else {
    shouldLog = bool;
  }
}
