"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function DraftNav({
  draftId,
  isCommissioner,
}: {
  draftId: string;
  isCommissioner: boolean;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: `/draft/${draftId}/board`, label: "Draft Board" },
    { href: `/draft/${draftId}/players`, label: "Available Players" },
    ...(isCommissioner
      ? [{ href: `/draft/${draftId}/settings`, label: "Settings" }]
      : []),
  ];

  return (
    <div className="flex items-center gap-2 border-b border-black/10 bg-white px-4 py-2 dark:border-white/10 dark:bg-neutral-950">
      <Link href="/dashboard" className="mr-2 text-sm text-black/50 dark:text-white/50">
        ← Dashboard
      </Link>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-bold",
            pathname === tab.href
              ? "bg-emerald-500 text-white"
              : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
