/** "Today", "Yesterday", "3 days ago", or a plain date for anything older. */
export function relativeDate(iso: string): string {
  const then = new Date(iso);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const thenStart = new Date(then);
  thenStart.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (todayStart.getTime() - thenStart.getTime()) / 86_400_000,
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  if (diffDays >= 7 && diffDays < 14) return "Last week";
  if (diffDays >= 14 && diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return then.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: then.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/** "March 2027" style month+year label. */
export function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
