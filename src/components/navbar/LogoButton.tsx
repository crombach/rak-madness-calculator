import Button from "../button/Button";
import "./LogoButton.scss";

/** Shown in the navbar on every page, whichever view is open. */
export const APP_NAME = "Rakulator";

/**
 * The character DSEG14 draws with every segment lit. A row of them behind the
 * name is the display's unlit segments, the way a real readout shows the shapes
 * it is not currently using.
 */
const DSEG14_ALL_SEGMENTS = "~";

/**
 * The name with every letter turned into an unlit cell. A space is left alone:
 * the face advances it far narrower than a cell, so filling it too would push
 * every cell after the space clear of the letter it is meant to sit under.
 */
const UNLIT_SEGMENTS = APP_NAME.replace(/\S/g, DSEG14_ALL_SEGMENTS);

export default function LogoButton({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick} className="logo-button">
      <span className="logo-button__name">
        <span className="logo-button__name-ghost" aria-hidden="true">
          {UNLIT_SEGMENTS}
        </span>
        {/*
          The name in a box of its own, because the well around it is a flex
          container: the glass has to fill the whole key, and `text-overflow`
          reaches the text of a block, not a flex item the browser wrapped for it.
        */}
        <span className="logo-button__name-text">{APP_NAME}</span>
      </span>
    </Button>
  );
}
