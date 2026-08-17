// Parses a spoken transcript like "Victory, twenty thousand naira, fifty
// cartons, on credit" into { amount, customer, note, paidNow }.
// Deliberately rule-based, not AI-based: predictable, free, and every
// result is meant to be reviewed by a human before it's saved — this
// only has to get close enough to save typing, never to be exact.

const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const SCALES = { hundred: 100, thousand: 1000, million: 1000000 };

function wordsToNumber(words) {
  let total = 0, current = 0, matchedAny = false;
  for (const raw of words) {
    const w = raw.toLowerCase().replace(/,/g, "");
    if (w in ONES) { current += ONES[w]; matchedAny = true; }
    else if (w in TENS) { current += TENS[w]; matchedAny = true; }
    else if (w === "hundred") { current = (current || 1) * 100; matchedAny = true; }
    else if (w === "thousand") { total += (current || 1) * 1000; current = 0; matchedAny = true; }
    else if (w === "million") { total += (current || 1) * 1000000; current = 0; matchedAny = true; }
    else if (/^\d+(\.\d+)?$/.test(w)) { current += parseFloat(w); matchedAny = true; }
    else break;
  }
  return matchedAny ? total + current : null;
}

export function extractAmount(transcript) {
  const text = transcript.toLowerCase();
  const nairaIdx = text.indexOf("naira");
  if (nairaIdx !== -1) {
    const windowText = text.slice(Math.max(0, nairaIdx - 30), nairaIdx + 10);
    const digitMatch = windowText.match(/([\d,]+(?:\.\d+)?)/);
    if (digitMatch) {
      const n = parseFloat(digitMatch[1].replace(/,/g, ""));
      if (n > 0) return n;
    }
    const beforeWords = text.slice(0, nairaIdx).trim().split(/\s+/).slice(-6);
    for (let start = 0; start < beforeWords.length; start++) {
      const slice = beforeWords.slice(start);
      const n = wordsToNumber(slice);
      if (n && n > 0) return n;
    }
  }
  const anyDigits = text.match(/([\d,]{3,})/);
  if (anyDigits) {
    const n = parseFloat(anyDigits[1].replace(/,/g, ""));
    if (n > 0) return n;
  }
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    const n = wordsToNumber(tokens.slice(i, i + 5));
    if (n && n >= 100) return n;
  }
  return null;
}

function similarity(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const dist = dp[m][n];
  return 1 - dist / Math.max(m, n);
}

export function matchCustomer(transcript, customers) {
  if (!customers || customers.length === 0) return null;
  const words = transcript.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  let best = null, bestScore = 0;
  for (const c of customers) {
    const nameWords = c.name.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      for (let len = 1; len <= nameWords.length + 1 && i + len <= words.length; len++) {
        const phrase = words.slice(i, i + len).join(" ");
        const score = similarity(phrase, c.name.toLowerCase());
        if (score > bestScore) { bestScore = score; best = c; }
      }
    }
  }
  return bestScore >= 0.72 ? best : null;
}

export function detectPaidNow(transcript) {
  const text = transcript.toLowerCase();
  const paidWords = ["paid", "cash", "settled", "full payment", "pay now", "paid in full"];
  const creditWords = ["credit", "owe", "owing", "balance", "on credit", "not paid", "unpaid"];
  const hasCredit = creditWords.some((w) => text.includes(w));
  const hasPaid = paidWords.some((w) => text.includes(w));
  return hasPaid && !hasCredit;
}

export function extractNote(transcript, customerName) {
  let text = transcript;
  if (customerName) {
    text = text.replace(new RegExp(customerName, "ig"), "");
  }
  text = text
    .replace(/₦?[\d,]+(\.\d+)?\s*naira/gi, "")
    .replace(/\bnaira\b/gi, "")
    .replace(/\b(paid|cash|settled|full payment|pay now|credit|owe|owing|balance|on credit|not paid|unpaid)\b/gi, "")
    .replace(/[,]{2,}/g, ",")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, "");
  return text.length > 2 && text.length <= 60 ? text : "";
}

export function parseVoiceEntry(transcript, customers) {
  const amount = extractAmount(transcript);
  const customer = matchCustomer(transcript, customers);
  const paidNow = detectPaidNow(transcript);
  const note = extractNote(transcript, customer ? customer.name : null);
  return { transcript, amount, customer, paidNow, note };
         }
