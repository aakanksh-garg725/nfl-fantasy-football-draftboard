/**
 * ===========================================================================
 * THE WHAMMY DARE POOL — edit this list freely.
 * ===========================================================================
 *
 * At the end of every round a random team gets hit with a "whammy": one of
 * these dares pops up on every screen in the draft for five seconds.
 *
 * To change the dares, just add/remove/reword the strings below and reload
 * the page — nothing else needs updating and no database change is involved.
 *
 * Two things worth knowing before you edit:
 *
 *   - Keep them short. The popup is one big line of text on a shared screen,
 *     so roughly a sentence works best.
 *
 *   - Which dare a round gets is derived from the draft's id and the round
 *     number, so every screen independently lands on the same one. Reordering
 *     or resizing this list therefore reshuffles which dare each round draws.
 *     Do that between drafts, not mid-draft, or screens that reloaded at
 *     different times could disagree.
 */
export const WHAMMY_DARES: string[] = [
  "Jay: Take 10 Shots",
];
