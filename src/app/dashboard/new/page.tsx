"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_ROSTER_COUNTS,
  ROSTER_SLOTS,
  SCORING_FORMAT_OPTIONS,
  TEAM_COUNT_OPTIONS,
  TIMER_DURATION_OPTIONS,
  type RosterCounts,
  type ScoringFormat,
  type TeamCountOption,
  type TimerDurationOption,
} from "@/lib/draft/types";
import { formatSeconds } from "@/lib/draft/timer";

export default function NewDraftPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [season, setSeason] = useState(2026);
  const [teamCount, setTeamCount] = useState<TeamCountOption>(10);
  const [rosterCounts, setRosterCounts] = useState<RosterCounts>(DEFAULT_ROSTER_COUNTS);
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>("ppr");
  const [timerSeconds, setTimerSeconds] = useState<TimerDurationOption>(90);
  const [teamNames, setTeamNames] = useState<string[]>(
    Array.from({ length: 10 }, () => "")
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roundCount = useMemo(
    () => ROSTER_SLOTS.reduce((sum, slot) => sum + rosterCounts[slot.key], 0),
    [rosterCounts]
  );

  const teamNameSlots = useMemo(() => {
    const next = [...teamNames];
    next.length = teamCount;
    return next.map((n) => n ?? "");
  }, [teamNames, teamCount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_draft", {
      p_name: name,
      p_season: season,
      p_team_count: teamCount,
      p_scoring_format: scoringFormat,
      p_roster_qb: rosterCounts.qb,
      p_roster_rb: rosterCounts.rb,
      p_roster_wr: rosterCounts.wr,
      p_roster_te: rosterCounts.te,
      p_roster_flex_rb_wr: rosterCounts.flexRbWr,
      p_roster_flex_wr_rb_te: rosterCounts.flexWrRbTe,
      p_roster_superflex: rosterCounts.superflex,
      p_roster_k: rosterCounts.k,
      p_roster_dst: rosterCounts.dst,
      p_roster_bench: rosterCounts.bench,
      p_pick_timer_seconds_default: timerSeconds,
      p_team_names: teamNameSlots.map((n) => n.trim() || null),
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/draft/${data}/board`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Create a draft</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm">
          Draft name
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2026 League Draft"
            className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
          />
        </label>

        <label className="text-sm">
          Season
          <input
            type="number"
            required
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
          />
        </label>

        <div className="text-sm">
          Number of teams
          <div className="mt-1 flex gap-2">
            {TEAM_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTeamCount(n)}
                className={`flex-1 rounded-md border py-2 font-bold ${
                  teamCount === n
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="text-sm">
          <legend className="mb-1">Roster ({roundCount} rounds total)</legend>
          <div className="grid grid-cols-2 gap-2">
            {ROSTER_SLOTS.map((slot) => (
              <label key={slot.key} className="flex flex-col gap-1">
                {slot.label}
                <select
                  value={rosterCounts[slot.key]}
                  onChange={(e) =>
                    setRosterCounts((prev) => ({
                      ...prev,
                      [slot.key]: Number(e.target.value),
                    }))
                  }
                  className="rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
                >
                  {Array.from(
                    { length: slot.max - ("min" in slot ? slot.min : 0) + 1 },
                    (_, i) => i + ("min" in slot ? slot.min : 0)
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="text-sm">
          Scoring format
          <div className="mt-1 flex gap-2">
            {SCORING_FORMAT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setScoringFormat(value)}
                className={`flex-1 rounded-md border py-2 font-bold ${
                  scoringFormat === value
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm">
          Pick timer
          <div className="mt-1 flex gap-2">
            {TIMER_DURATION_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTimerSeconds(s)}
                className={`flex-1 rounded-md border py-2 font-bold ${
                  timerSeconds === s
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                {formatSeconds(s)}
              </button>
            ))}
          </div>
        </div>

        <fieldset className="text-sm">
          <legend className="mb-1">Team names (optional — can rename later)</legend>
          <div className="grid grid-cols-2 gap-2">
            {teamNameSlots.map((value, i) => (
              <input
                key={i}
                type="text"
                value={value}
                placeholder={`Team ${i + 1}`}
                onChange={(e) => {
                  const next = [...teamNameSlots];
                  next[i] = e.target.value;
                  setTeamNames(next);
                }}
                className="rounded-md border border-black/10 bg-transparent px-3 py-2 dark:border-white/10"
              />
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-emerald-500 py-2 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create draft"}
        </button>
      </form>
    </div>
  );
}
