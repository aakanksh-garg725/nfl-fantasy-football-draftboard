"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";

/**
 * Where the face sits inside a Sleeper headshot, as a fraction of frame height.
 *
 * Measured off a sample of real headshots by taking the alpha-channel bounding
 * box per row: the crown lands at 10% of frame height and the chin at 75%
 * (sd ~3-5pp), and the head is horizontally centred to within half a percent
 * (sd 0.6pp) — so horizontal centring needs no correction, only vertical.
 *
 * Sleeper serves two sizes, 350x254 and 300x218, but both are 1.378:1, so
 * these fractions hold for either and the crop below can key off ratio alone.
 */
const FACE_TOP = 0.101;
const FACE_BOTTOM = 0.751;
const FACE_CENTER = (FACE_TOP + FACE_BOTTOM) / 2;
const SOURCE_RATIO = 350 / 254;

/**
 * How much of the frame's height the face fills, per shape.
 *
 * Short of 1 on a circle because it pinches in at top and bottom, so a face
 * sized to the full diameter has its crown and chin crushed against the curve.
 * The square runs looser still: it's used at a size where the shot reads as a
 * portrait rather than an avatar, and that wants headroom above the crown and
 * some shoulder below the chin.
 */
const FACE_FILL: Record<PortraitShape, number> = {
  circle: 0.8,
  square: 0.7,
};

export type PortraitShape = "circle" | "square";

/**
 * A player's face, or their initials when there's no usable image.
 *
 * Sleeper hands back a 403 for anyone it has no photo of, and the row's
 * `photo_url` is written optimistically at import time from the player id — so
 * a URL existing is no promise the image does. `onError` is the only reliable
 * signal, hence the state; a plain <img> would leave a broken-image glyph and
 * a CSS background would leave a hole in the card.
 */
export function PlayerPortrait({
  url,
  initials,
  size,
  shape = "circle",
  className,
}: {
  url: string | null;
  initials: string;
  /** Rendered box, in px. The crop below scales off it. */
  size: number;
  shape?: PortraitShape;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // Scale the whole frame up until the face alone is FACE_FILL of the box, then
  // shift it so the face's midpoint — not the frame's — lands on the box's
  // centre. The frame overflows the box on every side and is clipped by it.
  const imgHeight = Math.round((size * FACE_FILL[shape]) / (FACE_BOTTOM - FACE_TOP));
  const imgWidth = Math.round(imgHeight * SOURCE_RATIO);
  const imgTop = Math.round(size / 2 - FACE_CENTER * imgHeight);

  return (
    // A bounded box has to cut the torso off somewhere; the rounding is what
    // makes that read as a crop rather than a mistake.
    //
    // `relative` is load-bearing: the image inside is positioned against this
    // box. `shrink-0` keeps it square when the name beside it is wide.
    <div
      aria-hidden
      style={{ height: size, width: size }}
      className={clsx(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-black/15 dark:bg-white/15",
        shape === "circle" ? "rounded-full" : "rounded-lg",
        className
      )}
    >
      {url && !failed ? (
        <Image
          // Keyed by url so a player swapping into this slot during virtualized
          // scrolling re-attempts its own image instead of inheriting a
          // previous occupant's failure.
          key={url}
          src={url}
          alt=""
          width={imgWidth}
          height={imgHeight}
          // The pool is virtualized, so a card only exists in the DOM once it's
          // on screen — the default lazy loading has nothing left to defer and
          // its intersection check just delays the face appearing.
          loading="eager"
          onError={() => setFailed(true)}
          style={{ top: imgTop }}
          className="absolute left-1/2 max-w-none -translate-x-1/2"
        />
      ) : (
        <span
          className="font-black tracking-wide opacity-70"
          style={{ fontSize: Math.round(size * 0.33) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
