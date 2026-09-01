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
//
// The latin cut of each, as above. The unsubsetted weight files declare Cyrillic and
// Vietnamese too, and while `unicode-range` stops a browser fetching them, every
// reader still carries the rules and the build still carries the files.
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-700.css";
// DSEG14 Classic is missing on purpose. The logo paints it on every route and
// before anything else, so index.html declares that one face itself and preloads
// it, rather than wait on this bundle. Its file lives in public/ for that.
import "@fontsource/dseg7-classic/700.css";
import { AppDataContextProvider } from "./context/AppDataContext";
import { SettingsContextProvider } from "./context/SettingsContext";
import { ToastContextProvider } from "./context/ToastContext";
import Toaster from "./components/toaster/Toaster";
import "./index.scss";

// `@font-face` only fetches a file once layout needs it, so a face a later route is
// the first to paint arrives after that paint has committed to the fallback. Asking
// for each one here fetches and decodes it up front instead.
//
// This is the only list. A `rel=prefetch` for the same files used to sit above it and
// raced it, so every face downloaded twice: 75kB of the home page's transfer, for
// nothing. Fetching is already what a decode does, so add a weight here and nowhere
// else.
//
// DSEG14 Classic is not here. index.html declares that face and preloads it, and
// `font-display: block` there holds the paint until it lands, so a decode asked
// for from this bundle would only repeat what the shell already guarantees.
const FIRST_PAINT_FONTS = [
  ["400", "Chakra Petch"], // body copy
  ["500", "Chakra Petch"], // a toast's message
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
