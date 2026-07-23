import type { Position } from "./types";

export const POSITION_LABEL: Record<Position, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DST: "DST",
};

/** CSS custom property (defined in globals.css) holding each position's base hue. */
export const POSITION_COLOR_VAR: Record<Position, string> = {
  QB: "--pos-qb",
  RB: "--pos-rb",
  WR: "--pos-wr",
  TE: "--pos-te",
  K: "--pos-k",
  DST: "--pos-dst",
};

/**
 * Tinted card background for a position: mixes the position's base hue with
 * the current surface color, so it automatically adapts between light and
 * dark mode without a second hardcoded palette.
 */
export function positionCardBackground(position: Position): string {
  const cssVar = POSITION_COLOR_VAR[position];
  return `color-mix(in oklab, var(${cssVar}) 38%, var(--background))`;
}

/** Solid accent color for badges, borders, and the timer bar. */
export function positionAccentColor(position: Position): string {
  return `var(${POSITION_COLOR_VAR[position]})`;
}
