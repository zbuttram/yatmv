import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import invariant from "tiny-invariant";
import { ErrorBoundary } from "react-error-boundary";

import "./index.css";
import App from "./App";
import AppErrorBoundary from "./AppErrorBoundary";

const queryClient = new QueryClient();
const container = document.getElementById("root");
invariant(container);
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools />
      <ErrorBoundary FallbackComponent={AppErrorBoundary}>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
