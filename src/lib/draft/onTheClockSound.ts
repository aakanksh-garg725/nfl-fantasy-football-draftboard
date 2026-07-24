/**
 * The "you're on the clock" alert.
 *
 * Two tiers, in order of preference:
 *
 * 1. The draft chime in `public/sounds/`. This is the real alert.
 * 2. A synthesised stadium air horn, if the clip can't be played — a decode
 *    failure or an unsupported codec shouldn't leave the team on the clock with
 *    no audio at all.
 */

/**
 * Web path, not a filesystem one: `public/` is served at the site root, so the
 * file lands here. Must stay absolute — a relative URL would resolve against
 * the current page (`/draft/<id>/board/…`) and 404 on every route.
 */
export const ON_THE_CLOCK_SOUND_URL = "/sounds/nfl-draft-chime.mp3";

// ---------------------------------------------------------------------------
// Tier 1 — the override clip
// ---------------------------------------------------------------------------

/** One element, reused: re-creating it per pick re-downloads the clip. */
let sample: HTMLAudioElement | null = null;

function getSample(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!sample) {
    sample = new Audio(ON_THE_CLOCK_SOUND_URL);
    sample.preload = "auto";
    sample.volume = 0.7;
  }
  return sample;
}

/**
 * Fetches and buffers the clip ahead of time.
 *
 * Worth doing explicitly: created on demand, the element would start its
 * download at the exact moment the alert is supposed to sound, so a slow
 * connection turns the sting into a late one. The banner primes it on mount,
 * which is minutes of draft before anyone's turn comes up.
 */
export function primeOnTheClockSound(): void {
  getSample()?.load();
}

type SampleOutcome = "played" | "blocked" | "unusable";

async function playSample(): Promise<SampleOutcome> {
  const audio = getSample();
  if (!audio) return "unusable";

  try {
    // Rewind rather than trusting the playhead: back-to-back picks in the same
    // round would otherwise find the element parked at the end and play nothing.
    // Guarded because a fresh element has nothing to rewind, and touching
    // currentTime before any metadata has loaded is wasted work at best.
    if (audio.currentTime > 0) audio.currentTime = 0;
    await audio.play();
    return "played";
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      return "blocked";
    }

    // A real failure — a 404, a codec the browser won't take. Drop the element
    // so the next pick builds a fresh one and re-requests: writing the clip off
    // for the rest of the tab's life means a fixed asset (a corrected path, a
    // dev-server restart, a deploy) stays unheard until someone reloads, which
    // is a long time to be stuck on the fallback for a problem already solved.
    sample = null;
    console.warn(
      `[draft] couldn't play ${ON_THE_CLOCK_SOUND_URL}; falling back to the synthesised horn`,
      error
    );
    return "unusable";
  }
}

// ---------------------------------------------------------------------------
// Tier 2 — the synthesised horn
// ---------------------------------------------------------------------------

/**
 * A stadium air horn is a stack of detuned reeds, not a pure tone — these are
 * the pitches that give it its chord. The fifth is what makes it read as a horn
 * blast rather than a beep, and the two-cent detune supplies the beating that
 * keeps it from sounding synthetic.
 */
const HORN_PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 1.002, gain: 0.9 },
  { ratio: 1.5, gain: 0.55 },
  { ratio: 2, gain: 0.25 },
];

/** Fundamental, in Hz. Low enough to feel like a horn, high enough to cut through. */
const HORN_FUNDAMENTAL = 233;
const HORN_SECONDS = 1.1;
/**
 * Master gain. This is applied to the summed partials, not to the final signal,
 * so it isn't the output level: measured against an offline render of this same
 * graph, 0.11 lands the blast at roughly -9 dBFS. Loud enough to turn your head
 * from another tab, short of the jump-scare an air horn at full scale would be.
 */
const HORN_PEAK = 0.11;

type AudioContextConstructor = typeof AudioContext;

/** One context per tab: browsers cap how many a page may open and each costs a thread. */
let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext;
  if (!Ctor) return null;

  sharedContext ??= new Ctor();
  return sharedContext;
}

async function playHorn(): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const at = ctx.currentTime;

  // Sawtooths are all harmonics and no shaping, which is buzzy rather than
  // brassy; rolling the top off gives the blast a body instead of an edge.
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, at);

  const master = ctx.createGain();
  // Fast but not instant attack — a real horn takes a moment to reach pressure,
  // and a zero-length attack just clicks. The tail decays rather than cutting.
  master.gain.setValueAtTime(0.0001, at);
  master.gain.exponentialRampToValueAtTime(HORN_PEAK, at + 0.04);
  master.gain.setValueAtTime(HORN_PEAK, at + HORN_SECONDS - 0.25);
  master.gain.exponentialRampToValueAtTime(0.0001, at + HORN_SECONDS);

  filter.connect(master).connect(ctx.destination);

  for (const partial of HORN_PARTIALS) {
    const frequency = HORN_FUNDAMENTAL * partial.ratio;

    const oscillator = ctx.createOscillator();
    oscillator.type = "sawtooth";
    // The pitch scoops up as the horn spins up to pressure. Small, but it's the
    // difference between a horn and a synth pad.
    oscillator.frequency.setValueAtTime(frequency * 0.92, at);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, at + 0.07);

    const partialGain = ctx.createGain();
    partialGain.gain.setValueAtTime(partial.gain, at);

    oscillator.connect(partialGain).connect(filter);
    oscillator.start(at);
    oscillator.stop(at + HORN_SECONDS);
  }
}

/**
 * Sounds the alert, or silently does nothing if the browser won't allow it.
 *
 * Autoplay policy means audio created before the user has interacted with the
 * page can't start on its own. In practice anyone drafting has clicked
 * something long before their turn arrives; the case that stays silent is a tab
 * opened and left untouched, which is why the banner carries the alert visually
 * as well.
 */
export async function playOnTheClockSound(): Promise<void> {
  const outcome = await playSample();
  if (outcome === "played") return;

  // Autoplay policy gates the horn exactly as hard as it gates the clip, so
  // there's nothing to retry with — and staying quiet here keeps the horn
  // meaningful: if you hear it, the clip itself is broken, not merely blocked.
  if (outcome === "blocked") return;

  await playHorn();
}
