import { removeTwitchAuth } from "./twitch";
import React from "react";

export default function GlobalErrorBoundary({ error }) {
  return (
    <div className="mx-auto p-8 mt-16 mb-8 bg-gray-900 rounded-md text-center">
      <h1 className="text-4xl mb-8">An Error Has Occurred</h1>
      <pre className="mb-3">{error.toString()}</pre>
      <p className="mb-3">You can use the buttons below to try and recover.</p>
      <p className="mb-3">
        First, try{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => window.location.reload()}
        >
          reloading the site
        </span>
        .
      </p>
      <p className="mb-3">
        If that didn't work, try{" "}
        <a className="underline" href="/">
          clearing your open streams
        </a>
        .
      </p>
      <p className="mb-3">
        Still broken?{" "}
        <span
          className="underline cursor-pointer"
          onClick={() => {
            localStorage.clear();
            removeTwitchAuth();
            window.location.reload();
          }}
        >
          Reset everything
        </span>
        .
      </p>
      <p>
        Nothing worked?{" "}
        <a
          className="underline"
          href="https://github.com/zbuttram/yatmv/issues/new"
        >
          Submit an issue
        </a>
        .
      </p>
    </div>
  );
}
