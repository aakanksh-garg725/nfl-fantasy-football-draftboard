"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Calibrates local Date.now() against the DB server's clock once on mount,
 * so the timer countdown (lib/draft/timer.ts) agrees across every screen
 * regardless of local clock accuracy. Returns clientNow - serverNow, in ms.
 */
export function useServerClockOffset(): number {
  const [offsetMs, setOffsetMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function calibrate() {
      const beforeMs = Date.now();
      const { data, error } = await supabase.rpc("get_server_now");
      const afterMs = Date.now();
      if (error || !data || cancelled) return;

      const roundTripMs = afterMs - beforeMs;
      const serverNowMs = new Date(data).getTime() + roundTripMs / 2;
      setOffsetMs(Math.round(beforeMs + roundTripMs / 2 - serverNowMs));
    }

    calibrate();
    const interval = setInterval(calibrate, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return offsetMs;
}
