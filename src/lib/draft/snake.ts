/**
 * Pure snake-draft order logic. Mirrors the SQL used by the `create_draft`
 * RPC (supabase/migrations/0002_rpc_functions.sql) exactly — kept here as the
 * single documented reference and for client-side preview/tests.
 */

export interface GeneratedPickSlot {
  round: number;
  pickInRound: number;
  overallPickNumber: number;
  /** 1-indexed team draft slot (join against `teams.slot_number`) */
  teamSlotNumber: number;
}

/**
 * Generates the full picks skeleton for a snake draft: odd rounds go
 * 1..teamCount, even rounds reverse teamCount..1.
 */
export function generateSnakeOrder(
  teamCount: number,
  roundCount: number
): GeneratedPickSlot[] {
  const slots: GeneratedPickSlot[] = [];

  for (let round = 1; round <= roundCount; round++) {
    const isReversed = round % 2 === 0;
    for (let i = 0; i < teamCount; i++) {
      const pickInRound = i + 1;
      const teamSlotNumber = isReversed ? teamCount - i : i + 1;
      const overallPickNumber = (round - 1) * teamCount + pickInRound;
      slots.push({ round, pickInRound, overallPickNumber, teamSlotNumber });
    }
  }

  return slots;
}

/** Which team slot picks at a given overall pick number, without generating the full list. */
export function teamSlotForOverallPick(
  overallPickNumber: number,
  teamCount: number
): { round: number; pickInRound: number; teamSlotNumber: number } {
  const round = Math.ceil(overallPickNumber / teamCount);
  const pickInRound = overallPickNumber - (round - 1) * teamCount;
  const isReversed = round % 2 === 0;
  const teamSlotNumber = isReversed
    ? teamCount - (pickInRound - 1)
    : pickInRound;
  return { round, pickInRound, teamSlotNumber };
}
