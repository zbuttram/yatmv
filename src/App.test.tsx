import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import App from "./App";

const queryClient = new QueryClient();

function QCProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

test("doesn't explode", () => {
  render(
    <QCProvider>
      <App />
    </QCProvider>
  );
});
