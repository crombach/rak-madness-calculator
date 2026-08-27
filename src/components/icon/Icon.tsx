import { ReactNode } from "react";
import "./Icon.scss";

/**
 * The box Material Symbols draws in. Every shape below is copied verbatim out of
 * the set at weight 400, so none of them has to be rescaled onto a grid of the
 * app's own.
 */
const SYMBOLS_VIEW_BOX = "0 -960 960 960";

/**
 * The icon set, drawn from Material Symbols Sharp at weight 400, which Google
 * ships under Apache 2.0. Sharp because its terminals are square and its corners
 * unrounded, which is the same panel the app's keys and bezels are pressed out of.
 *
 * Inlined as path data rather than imported, because an icon package built on
 * components pulls a UI library and a CSS-in-JS runtime into the bundle for the
 * sake of a dozen shapes.
 *
 * One shape is not Material at all: `GitHubIcon` is a wordmark, and passes the
 * `viewBox` it was drawn in.
 */
function Icon({
  name,
  viewBox = SYMBOLS_VIEW_BOX,
  children,
}: {
  name: string;
  viewBox?: string;
  children: ReactNode;
}) {
  return (
    <svg
      className="icon"
      viewBox={viewBox}
      aria-hidden="true"
      focusable="false"
      // An icon here is decorative, so a test has nothing else to find it by. The
      // toaster and player status suites both look one up by this.
      data-testid={name}
    >
      {children}
    </svg>
  );
}

export function UnfoldMoreIcon() {
  return (
    <Icon name="UnfoldMoreIcon">
      <path d="M480-120 300-300l44-44 136 136 136-136 44 44-180 180ZM344-612l-44-44 180-180 180 180-44 44-136-136-136 136Z" />
    </Icon>
  );
}

export function InfoIcon() {
  return (
    <Icon name="InfoIcon">
      <path d="M453-280h60v-240h-60v240Zm50.5-323.2q9.5-9.2 9.5-22.8 0-14.45-9.48-24.22-9.48-9.78-23.5-9.78t-23.52 9.78Q447-640.45 447-626q0 13.6 9.48 22.8 9.48 9.2 23.5 9.2t23.52-9.2ZM480.27-80q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.34Q80-397.68 80-480.5t31.5-155.66Q143-709 197.5-763t127.34-85.5Q397.68-880 480.5-880t155.66 31.5Q709-817 763-763t85.5 127Q880-563 880-480.27q0 82.74-31.5 155.5Q817-252 763-197.68q-54 54.31-127 86Q563-80 480.27-80Z" />
    </Icon>
  );
}

export function FactCheckIcon() {
  return (
    <Icon name="FactCheckIcon">
      <path d="M200-280h200v-80H200v80Zm382-80 198-198-57-57-141 142-57-57-56 57 113 113Zm-382-80h200v-80H200v80Zm0-160h200v-80H200v80ZM72-120v-720h816v720H72Z" />
    </Icon>
  );
}

export function LeaderboardIcon() {
  return (
    <Icon name="LeaderboardIcon">
      <path d="M80-120v-480h210v480H80Zm295 0v-720h210v720H375Zm295 0v-400h210v400H670Z" />
    </Icon>
  );
}

/**
 * Filled rather than the outline `refresh` glyph the rest of Material Symbols
 * offers, so the navbar's refresh key reads as solid mass beside the two filled
 * keys next to it rather than a step lighter.
 */
export function UpdateIcon() {
  return (
    <Icon name="UpdateIcon">
      <path d="M480-120q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-480q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-840q82 0 155.5 35T760-706v-94h80v240H600v-80h110q-41-56-101-88t-129-32q-117 0-198.5 81.5T200-480q0 117 81.5 198.5T480-200q105 0 183.5-68T756-440h82q-15 137-117.5 228.5T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z" />
    </Icon>
  );
}

export function ScreenRotationIcon() {
  return (
    <Icon name="ScreenRotationIcon">
      <path d="M544-48 128-462h86l330 330 246-246H652v-60h240v240h-60v-138L544-48ZM68-522v-240h60v138l288-288 416 414h-86L416-828 170-582h138v60H68Z" />
    </Icon>
  );
}

export function EmojiEventsIcon() {
  return (
    <Icon name="EmojiEventsIcon">
      <path d="M298-120v-60h152v-148q-54-11-96-46.5T296-463q-74-8-125-60t-51-125v-104h164v-88h392v88h164v104q0 73-51 125t-125 60q-16 53-58 88.5T510-328v148h152v60H298Zm-14-406v-166H180v44q0 45 29.5 78.5T284-526Zm392 0q45-10 74.5-43.5T780-648v-44H676v166Z" />
    </Icon>
  );
}

/**
 * The trophy drawn as an outline, which is what a player's status wears. Held
 * apart from the filled one above, which the footer's link keeps.
 */
export function EmojiEventsOutlinedIcon() {
  return (
    <Icon name="EmojiEventsOutlinedIcon">
      <path d="M298-120v-60h152v-148q-54-11-96-46.5T296-463q-74-8-125-60t-51-125v-104h164v-88h392v88h164v104q0 73-51 125t-125 60q-16 53-58 88.5T510-328v148h152v60H298Zm-14-406v-166H180v44q0 45 29.5 78.5T284-526Zm292.5 101q39.5-40 39.5-97v-258H344v258q0 57 39.5 97t96.5 40q57 0 96.5-40ZM676-526q45-10 74.5-43.5T780-648v-44H676v166Zm-196-57Z" />
    </Icon>
  );
}

export function SkullOutlinedIcon() {
  return (
    <Icon name="SkullOutlinedIcon">
      <path d="M240-80v-170q-36-16-65.5-43T124-355.5Q103-391 91.5-433T80-520q0-158 112-259t288-101q176 0 288 101t112 259q0 45-11.5 87T836-355.5Q815-320 785.5-293T720-250v170H240Zm60-60h70v-100h60v100h100v-100h60v100h70v-147q37-11 66.5-33t50.5-52.5q21-30.5 32-68.02 11-37.52 11-79.33 0-133.99-94-217.07Q632-820 480.04-820q-151.95 0-246 83.09Q140-653.82 140-519.81q0 41.81 11 79.31t32 68q21 30.5 50.5 52.5t66.5 33v147Zm120-220h120l-60-120-60 120Zm-79.91-100q28.91 0 49.41-20.59 20.5-20.59 20.5-49.5t-20.59-49.41q-20.59-20.5-49.5-20.5t-49.41 20.59q-20.5 20.59-20.5 49.5t20.59 49.41q20.59 20.5 49.5 20.5Zm280 0q28.91 0 49.41-20.59 20.5-20.59 20.5-49.5t-20.59-49.41q-20.59-20.5-49.5-20.5t-49.41 20.59q-20.5 20.59-20.5 49.5t20.59 49.41q20.59 20.5 49.5 20.5ZM480-140Z" />
    </Icon>
  );
}

/**
 * A player still standing, drawn as an outline beside the other two a status
 * wears. Filled, the face is a disc with the eyes and the mouth cut out of it in
 * the same direction the disc is drawn, which the non-zero fill rule reads as one
 * shape rather than as holes: it came out as a blot.
 */
export function SentimentVerySatisfiedOutlinedIcon() {
  return (
    <Icon name="SentimentVerySatisfiedOutlinedIcon">
      <path d="M601.5-296.5Q657-332 682-393H278q26 61 81 96.5T480-261q66 0 121.5-35.5ZM302-533l45-45 45 45 36-36-81-81-81 81 36 36Zm267 0 45-45 45 45 36-36-81-81-81 81 36 36ZM324-111.5Q251-143 197-197t-85.5-127Q80-397 80-480t31.5-156Q143-709 197-763t127-85.5Q397-880 480-880t156 31.5Q709-817 763-763t85.5 127Q880-563 880-480t-31.5 156Q817-251 763-197t-127 85.5Q563-80 480-80t-156-31.5ZM480-480Zm241 241q99-99 99-241t-99-241q-99-99-241-99t-241 99q-99 99-99 241t99 241q99 99 241 99t241-99Z" />
    </Icon>
  );
}

/**
 * The tick alone, cropped to its own edges rather than Material's full
 * 960x960 box, which would otherwise sit empty around it.
 */
export function CheckIcon() {
  return (
    <Icon name="CheckIcon" viewBox="257 -654 451 333">
      <path d="m419-321 289-290-43-43-246 247-119-119-43 43 162 162Z" />
    </Icon>
  );
}

export function EventIcon() {
  return (
    <Icon name="EventIcon">
      <path d="M528-248.18q-28-28.19-28-69Q500-358 528.18-386q28.19-28 69-28Q638-414 666-385.82q28 28.19 28 69Q694-276 665.82-248q-28.19 28-69 28Q556-220 528-248.18ZM120-80v-740h125v-60h65v60h340v-60h65v60h125v740H120Zm60-60h600v-430H180v430Z" />
    </Icon>
  );
}

export function CheckCircleIcon() {
  return (
    <Icon name="CheckCircleIcon">
      <path d="m421-298 283-283-46-45-237 237-120-120-45 45 165 166Zm59 218q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Z" />
    </Icon>
  );
}

export function CloseIcon() {
  return (
    <Icon name="CloseIcon">
      <path d="m249-207-42-42 231-231-231-231 42-42 231 231 231-231 42 42-231 231 231 231-42 42-231-231-231 231Z" />
    </Icon>
  );
}

export function ReportIcon() {
  return (
    <Icon name="ReportIcon">
      <path d="M480-281q14 0 24.5-10.5T515-316q0-14-10.5-24.5T480-351q-14 0-24.5 10.5T445-316q0 14 10.5 24.5T480-281Zm-30-144h60v-263h-60v263ZM330-120 120-330v-300l210-210h300l210 210v300L630-120H330Z" />
    </Icon>
  );
}

export function WarningIcon() {
  return (
    <Icon name="WarningIcon">
      <path d="m40-120 440-760 440 760H40Zm465.5-125.68q8.5-8.67 8.5-21.5 0-12.82-8.68-21.32-8.67-8.5-21.5-8.5-12.82 0-21.32 8.68-8.5 8.67-8.5 21.5 0 12.82 8.68 21.32 8.67 8.5 21.5 8.5 12.82 0 21.32-8.68ZM454-348h60v-224h-60v224Z" />
    </Icon>
  );
}

/**
 * Which side has the ball, pointed at their score in the game dialog.
 *
 * A shape rather than a triangle character, because the mark has to stand level
 * with a row of seven-segment digits. A glyph is placed by whichever font in the
 * stack happens to carry it, and the two triangles in one face are not even drawn
 * at the same height, so where it landed was the reader's font stack's to decide.
 *
 * The box is cut to the shape's own edges rather than left at Material's, which
 * gives a triangle a third of its width in air on one side and a fifth on the
 * other. In the readout the mark is spaced against digits, and air the box carries
 * is space the row cannot see to set.
 */
export function PossessionIcon() {
  return (
    <Icon name="PossessionIcon" viewBox="320 -760 440 560">
      <path d="M320-200v-560l440 280-440 280Z" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon name="SettingsIcon">
      <path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm112-260q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Z" />
    </Icon>
  );
}

export function GitHubIcon() {
  return (
    <Icon name="GitHubIcon" viewBox="0 0 24 24">
      <path d="M12 1.27a11 11 0 00-3.48 21.46c.55.09.73-.28.73-.55v-1.84c-3.03.64-3.67-1.46-3.67-1.46-.55-1.29-1.28-1.65-1.28-1.65-.92-.65.1-.65.1-.65 1.1 0 1.73 1.1 1.73 1.1.92 1.65 2.57 1.2 3.21.92a2 2 0 01.64-1.47c-2.47-.27-5.04-1.19-5.04-5.5 0-1.1.46-2.1 1.2-2.84a3.76 3.76 0 010-2.93s.91-.28 3.11 1.1c1.8-.49 3.7-.49 5.5 0 2.1-1.38 3.02-1.1 3.02-1.1a3.76 3.76 0 010 2.93c.83.74 1.2 1.74 1.2 2.94 0 4.21-2.57 5.13-5.04 5.4.45.37.82.92.82 2.02v3.03c0 .27.1.64.73.55A11 11 0 0012 1.27" />
    </Icon>
  );
}
