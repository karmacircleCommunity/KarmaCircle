import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import App from "./App";
import { persistor, store } from "@app/store/store";
import "@styles/index.css";

const vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty("--vh", `${vh}px`);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Provider store={store}>
    <HelmetProvider>
      <PersistGate loading={null} persistor={persistor}>
        <App />
        <Analytics />
        <SpeedInsights />
      </PersistGate>
    </HelmetProvider>
  </Provider>,
);
