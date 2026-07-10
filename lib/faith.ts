// Faith Mode content. Scripture quotations are from the King James Version,
// which is in the public domain. Kept short and always cited. The reflections
// are original devotional writing. Pronouns referring to God are reverentially
// capitalized (He/Him/His and, in prayers, You/Your/Yours).

export type Verse = {
  text: string;
  ref: string;
  context: string;
  meaning: string;
  application: string;
  prayer: string;
};

export const VERSES: Verse[] = [
  {
    text: "Let us not be weary in well doing.",
    ref: "Galatians 6:9",
    context:
      "Paul is writing to churches in Galatia who had grown tired of doing good and were tempted to give up.",
    meaning:
      "Doing good for others is often slow, unseen work. The verse names the weariness honestly, then gently urges us not to quit — a harvest comes in due season.",
    application:
      "The promises you keep for people rarely pay off immediately. Keep showing up anyway. Small faithfulness compounds.",
    prayer:
      "Lord, when caring for others feels thankless, renew my strength and keep my hands from growing slack.",
  },
  {
    text: "Bear ye one another’s burdens.",
    ref: "Galatians 6:2",
    context:
      "Written to a community learning how to live together in grace rather than judgment.",
    meaning:
      "We are not meant to carry life alone. To bear a burden is to step under the weight someone else is carrying and share it.",
    application:
      "Every promise here is you offering to carry a little of someone's load. Notice whose burden you can help shoulder today.",
    prayer:
      "Father, show me the burdens the people around me are carrying, and make me willing to help lift them.",
  },
  {
    text: "Let all your things be done with charity.",
    ref: "1 Corinthians 16:14",
    context:
      "Paul's closing charge to the Corinthian church after a long letter about how to live together.",
    meaning:
      "'Charity' here is love. It's a call to let love be the motive underneath everything — not duty, not appearance, but love.",
    application:
      "Before you check off a promise, pause on the why. Let love, not obligation, be the reason you follow through.",
    prayer:
      "Lord, let love be the root of what I do today, not just the actions themselves.",
  },
  {
    text: "Be kindly affectioned one to another.",
    ref: "Romans 12:10",
    context:
      "Part of Paul's picture of what genuine community looks like in the church at Rome.",
    meaning:
      "Warm, family-like affection — treating others as if they truly belong to you, honoring them above yourself.",
    application:
      "The people on your list aren't tasks. Let real affection shape how you remember them today.",
    prayer:
      "God, grow in me a genuine tenderness for the people You've placed in my life.",
  },
  {
    text: "Faithful is He that calleth you.",
    ref: "1 Thessalonians 5:24",
    context:
      "Paul reassures a young church that God will finish the good work begun in them.",
    meaning:
      "Our faithfulness is a response to God's faithfulness first. He is dependable even when we are not.",
    application:
      "When you fall short on a promise, remember you're not the source of faithfulness — you're learning it from the One who is faithful.",
    prayer:
      "Faithful God, thank You that Your steadiness holds me even when mine fails. Teach me to keep my word as You keep Yours.",
  },
  {
    text: "A friend loveth at all times.",
    ref: "Proverbs 17:17",
    context:
      "A proverb from Israel's wisdom tradition, contrasting fair-weather ties with true friendship.",
    meaning:
      "Real love isn't seasonal. It shows up in the ordinary and the hard alike — 'at all times,' not only when convenient.",
    application:
      "Consistency is its own kind of love. Following up when it's inconvenient is exactly what this verse describes.",
    prayer:
      "Lord, make me a friend who loves at all times, not only when it's easy.",
  },
  {
    text: "Whatsoever thy hand findeth to do, do it with thy might.",
    ref: "Ecclesiastes 9:10",
    context:
      "The Preacher, reflecting on a fleeting life, urges wholehearted engagement with the work in front of us.",
    meaning:
      "Don't hold back on the good you can do now. Give it your full effort while you have the chance.",
    application:
      "The promise in front of you today is the one to pour yourself into. Do this small thing wholeheartedly.",
    prayer:
      "God, help me give my full heart to the good I can do today, not a half-hearted version of it.",
  },
  {
    text: "We love Him, because He first loved us.",
    ref: "1 John 4:19",
    context: "John writes to churches about the source and nature of love.",
    meaning:
      "Our capacity to love others flows from having been loved first. Love received becomes love given.",
    application:
      "You can love the people on your list generously because you're drawing from a love you didn't have to earn.",
    prayer:
      "Lord, let me love others out of the overflow of how You have loved me.",
  },
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
