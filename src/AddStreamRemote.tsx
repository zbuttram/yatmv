import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { addRemoteStream } from "./remoteChannel";

export default function AddStreamRemote() {
  const [state, setState] = useState<"working" | "complete" | "failed">(
    "working"
  );

  const [searchParams] = useSearchParams();
  const stream = searchParams.get("stream");

  useEffect(() => {
    if (!stream) {
      setState("failed");
    }
    (async () => {
      try {
        await addRemoteStream(stream);
        setState("complete");
        window.close(); // only works if the page was opened by a script into a new tab
      } catch (e) {
        setState("failed");
      }
    })();
  }, [stream]);

  return (
    <div className="flex flex-col align-middle">
      <div>
        {(() => {
          switch (state) {
            case "working":
              return "Waiting on main tab...";
            case "complete":
              return "Stream added, you may close the tab.";
            case "failed":
              return "No existing tab found.";
            default:
              return null;
          }
        })()}
      </div>
      <button
        onClick={() => {
          window.location.href =
            window.location.origin + `/?streams=${stream}&primary=${stream}`;
        }}
        className="underline"
      >
        Open {stream} in This Tab
      </button>
    </div>
  );
}
