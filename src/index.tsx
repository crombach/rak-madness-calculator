import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
// Chakra Petch ships one file per weight rather than one variable file, so only the
// four the app sets anything in are asked for: body copy at 400, a toast's message at
// 500, a button and a team's name at 600, and every screen-printed label at 700.
//
// The latin cut of each rather than the whole family, which also carries Thai and
// Vietnamese. Those two are small enough that Vite inlines them into the stylesheet,
// so asking for them costs every reader 17kB of base64 for scripts the app has no
// copy in.
import "@fontsource/chakra-petch/latin-400.css";
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
// IBM Plex Mono ships one file per weight rather than one variable file, so only the
// three the app sets anything in are asked for: the tables and the pick chips at 400,
// the spread and a player's standing at 600, and a game's own mark at 700.
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";
// DSEG14 Classic is missing on purpose. The logo paints it on every route and
// before anything else, so index.html declares that one face itself and preloads
// it, rather than wait on this bundle. Its file lives in public/ for that.
import "@fontsource/dseg7-classic/700.css";
import chakraPetch400Url from "@fontsource/chakra-petch/files/chakra-petch-latin-400-normal.woff2?url";
import chakraPetch500Url from "@fontsource/chakra-petch/files/chakra-petch-latin-500-normal.woff2?url";
import chakraPetch600Url from "@fontsource/chakra-petch/files/chakra-petch-latin-600-normal.woff2?url";
import chakraPetch700Url from "@fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2?url";
import ibmPlexMono400Url from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url";
import ibmPlexMono700Url from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2?url";
import dseg7Url from "@fontsource/dseg7-classic/files/dseg7-classic-latin-700-normal.woff2?url";
import { AppDataContextProvider } from "./context/AppDataContext";
import { SettingsContextProvider } from "./context/SettingsContext";
import { ToastContextProvider } from "./context/ToastContext";
import Toaster from "./components/toaster/Toaster";
import prefetchLink from "./utils/prefetchLink";
import "./index.scss";

// @font-face only fetches a file once layout needs it, so this warms every
// weight into cache regardless of when its route reaches it.
const PREFETCH_FONT_URLS = [
  chakraPetch400Url,
  chakraPetch500Url,
  chakraPetch600Url,
  chakraPetch700Url,
  ibmPlexMono400Url,
  ibmPlexMono700Url,
  dseg7Url,
];
for (const href of PREFETCH_FONT_URLS) {
  prefetchLink(href, {
    as: "font",
    type: "font/woff2",
    crossorigin: "anonymous",
  });
}
// A cache warm alone still shows the fallback face until something decodes the
// font outright. Every weight below is decoded up front rather than left to
// arrive after the paint that needs it has already committed to the fallback.
//
// DSEG14 Classic is not here. index.html declares that face and preloads it, and
// `font-display: block` there holds the paint until it lands, so a decode asked
// for from this bundle would only repeat what the shell already guarantees.
const FIRST_PAINT_FONTS = [
  ["400", "Chakra Petch"], // body copy
  ["600", "Chakra Petch"], // buttons, e.g. the home page's own
  ["700", "Chakra Petch"], // table headers and other screen-printed labels
  ["400", "IBM Plex Mono"], // table cells
  ["600", "IBM Plex Mono"], // the home page's selected season row
  ["700", "IBM Plex Mono"], // a table's bold rank column
  // The scoreline's readout. Nothing paints it until the game status dialog
  // opens, so a decode left until then swaps the face under a dialog already on
  // screen. `useScorelineFit` measures that dialog, and it measures the fallback
  // when the swap has yet to land.
  ["700", "DSEG7 Classic"],
];
for (const [weight, family] of FIRST_PAINT_FONTS) {
  document.fonts.load(`${weight} 1em "${family}"`).catch(() => {});
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("index.html is missing the #root element");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsContextProvider>
        <ToastContextProvider>
          <AppDataContextProvider>
            <App />
          </AppDataContextProvider>
          <Toaster />
        </ToastContextProvider>
      </SettingsContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
