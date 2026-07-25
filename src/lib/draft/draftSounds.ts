/**
 * Draft audio, shared by every profile in the room (not just the team on the
 * clock). Two distinct cues:
 *
 * 1. The NFL draft chime — sounds once, at the very start of the draft.
 * 2. A countdown beep — one short blip per second through the final ten
 *    seconds of every pick, so the room hears the clock running out.
 *
 * The chime has two tiers, in order of preference:
 *   a. The draft chime in `public/sounds/`. This is the real sting.
 *   b. A synthesised stadium air horn, if the clip can't be played — a decode
 *      failure or an unsupported codec shouldn't leave the draft opening in
 *      silence.
 */

/**
 * Web path, not a filesystem one: `public/` is served at the site root, so the
 * file lands here. Must stay absolute — a relative URL would resolve against
 * the current page (`/draft/<id>/board/…`) and 404 on every route.
 */
export const DRAFT_START_SOUND_URL = "/sounds/nfl-draft-chime.mp3";

// ---------------------------------------------------------------------------
// Chime tier 1 — the override clip
// ---------------------------------------------------------------------------

/** One element, reused: re-creating it re-downloads the clip. */
let sample: HTMLAudioElement | null = null;

function getSample(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;

  if (!sample) {
    sample = new Audio(DRAFT_START_SOUND_URL);
    sample.preload = "auto";
    sample.volume = 0.7;
  }
  return sample;
}

/**
 * Fetches and buffers the clip ahead of time.
 *
 * Worth doing explicitly: created on demand, the element would start its
 * download at the exact moment the draft opens, so a slow connection turns the
 * sting into a late one. The provider primes it on mount, which is however long
 * it takes the commissioner to hit start.
 */
export function primeDraftStartSound(): void {
  getSample()?.load();
}

type SampleOutcome = "played" | "blocked" | "unusable";

async function playSample(): Promise<SampleOutcome> {
  const audio = getSample();
  if (!audio) return "unusable";

  try {
    // Rewind rather than trusting the playhead: guarded because a fresh element
    // has nothing to rewind, and touching currentTime before any metadata has
    // loaded is wasted work at best.
    if (audio.currentTime > 0) audio.currentTime = 0;
    await audio.play();
    return "played";
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      return "blocked";
    }

    // A real failure — a 404, a codec the browser won't take. Drop the element
    // so a later attempt builds a fresh one and re-requests: writing the clip
    // off for the rest of the tab's life means a fixed asset (a corrected path,
    // a dev-server restart, a deploy) stays unheard until someone reloads.
    sample = null;
    console.warn(
      `[draft] couldn't play ${DRAFT_START_SOUND_URL}; falling back to the synthesised horn`,
      error
    );
    return "unusable";
  }
}

// ---------------------------------------------------------------------------
// Shared audio context
// ---------------------------------------------------------------------------

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

async function resumeContext(ctx: AudioContext): Promise<boolean> {
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === "running";
}

// ---------------------------------------------------------------------------
// Chime tier 2 — the synthesised horn
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
 * graph, 0.11 lands the blast at roughly -9 dBFS.
 */
const HORN_PEAK = 0.11;

async function playHorn(): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;
  if (!(await resumeContext(ctx))) return;

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
 * Sounds the draft-opening chime, or silently does nothing if the browser won't
 * allow it.
 *
 * Autoplay policy means audio created before the user has interacted with the
 * page can't start on its own. The commissioner who starts the draft has
 * clicked to do so, so their tab is unlocked; a drafter who's opened the board
 * and left it untouched may stay silent, which is why the opening is carried
 * visually too.
 */
export async function playDraftStartSound(): Promise<void> {
  const outcome = await playSample();
  if (outcome === "played") return;

  // Autoplay policy gates the horn exactly as hard as it gates the clip, so
  // there's nothing to retry with — and staying quiet here keeps the horn
  // meaningful: if you hear it, the clip itself is broken, not merely blocked.
  if (outcome === "blocked") return;

  await playHorn();
}

// ---------------------------------------------------------------------------
// The final-ten-seconds countdown beep
// ---------------------------------------------------------------------------

/** Pitch of the countdown blip, in Hz — a clean, alerting tone that isn't shrill. */
const BEEP_FREQUENCY = 880;
const BEEP_SECONDS = 0.12;
/** Deliberately quieter than the horn: it fires ten times a pick, every pick. */
const BEEP_PEAK = 0.16;

/**
 * A single short blip, for one tick of the final countdown.
 *
 * Synthesised rather than a clip so it costs no download and can't be caught by
 * the same decode failure the chime guards against. Silently no-ops until the
 * tab's audio is unlocked by an interaction, same as every other cue here.
 */
export async function playCountdownBeep(): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;
  if (!(await resumeContext(ctx))) return;

  const at = ctx.currentTime;

  const oscillator = ctx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(BEEP_FREQUENCY, at);

  const gain = ctx.createGain();
  // Short attack and an exponential tail so the blip reads as a clean beep
  // rather than a click (instant edges) or a buzz (a flat, held tone).
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(BEEP_PEAK, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + BEEP_SECONDS);

  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(at + BEEP_SECONDS);
}
