import React, { useEffect, useState } from "react";
import { addRemoteStream } from "./remoteChannel";

export default function AddStreamRemote() {
  const [state, setState] = useState<"working" | "complete" | "failed">(
    "working"
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    const stream = url.searchParams.get("stream");
    if (!stream) {
      setState("failed");
    }
    try {
      addRemoteStream(stream);
      setState("complete");
      window.close(); // only works if the page was opened by a script into a new tab
    } catch (e) {
      setState("failed");
    }
  }, []);

  return <>{state}</>;
}
