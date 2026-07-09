// Faith Mode content. Scripture quotations are from the King James Version,
// which is in the public domain. Kept short and always cited.

export type Verse = { text: string; ref: string };

export const VERSES: Verse[] = [
  { text: "Let us not be weary in well doing.", ref: "Galatians 6:9" },
  { text: "Bear ye one another’s burdens.", ref: "Galatians 6:2" },
  { text: "Let all your things be done with charity.", ref: "1 Corinthians 16:14" },
  { text: "Be kindly affectioned one to another.", ref: "Romans 12:10" },
  { text: "Faithful is he that calleth you.", ref: "1 Thessalonians 5:24" },
  { text: "A friend loveth at all times.", ref: "Proverbs 17:17" },
  {
    text: "Whatsoever thy hand findeth to do, do it with thy might.",
    ref: "Ecclesiastes 9:10",
  },
  { text: "We love him, because he first loved us.", ref: "1 John 4:19" },
];

/** A stable "verse of the day" so it doesn't change on every refresh. */
export function verseOfToday(): Verse {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return VERSES[dayOfYear % VERSES.length];
}

/** Faith-framed encouragements shown after keeping a promise. */
export function faithEncouragements(name: string, isSelf: boolean): string[] {
  if (isSelf) {
    return [
      "You tended the garden you were given today.",
      "Faithful in little. That is no small thing.",
      "“Let us not be weary in well doing.” — Galatians 6:9",
    ];
  }
  return [
    `You loved ${name} the way you have been loved.`,
    `Faithfulness in small things is faithfulness indeed. ${name} is seen.`,
    "“Bear ye one another’s burdens.” — Galatians 6:2",
    `Well done. ${name} is worth it.`,
  ];
}
