import React from "react";

export const INK = "#1F4D3A";
export const INK_DARK = "#153327";
export const ACCENT = "#E8A33D";
export const PAPER = "#FAF8F3";
export const TEXT = "#1A1A16";
export const RUST = "#C4462B";
export const SAGE = "#7FA98E";
export const LINE = "#DDD6C4";
export const CARD = "#FFFFFF";

export const cardStyle = { background: CARD, border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 14px" };
export const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${LINE}`, background: "#fff", fontSize: 15, outline: "none", marginBottom: 12 };
export const labelStyle = { fontSize: 12.5, fontWeight: 600, color: "#6B6455", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: 0.4 };

export function FontFaces() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      body { margin: 0; }
      .num { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
      .disp { font-family: 'Fraunces', serif; }
      button { font-family: inherit; cursor: pointer; }
      input, select { font-family: inherit; }
      ::placeholder { color: #B7AF9B; }
      @keyframes drawCheck { from { stroke-dashoffset: 140; } to { stroke-dashoffset: 0; } }
      @keyframes popIn { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @media (prefers-reduced-motion: reduce) {
              .splash-icon, .splash-check, .splash-text { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; }
      }
    `}</style>
  );
}

export const CURRENCIES = [
  // =========================
  // AFRICA
  // =========================

  { code: "NGN", symbol: "₦", label: "Nigerian Naira", dialCode: "234", trunkPrefix: "0" },
  { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi", dialCode: "233", trunkPrefix: "0" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling", dialCode: "254", trunkPrefix: "0" },
  { code: "ZAR", symbol: "R", label: "South African Rand", dialCode: "27", trunkPrefix: "0" },
  { code: "EGP", symbol: "E£", label: "Egyptian Pound", dialCode: "20", trunkPrefix: "0" },
  { code: "XOF", symbol: "CFA", label: "West African CFA Franc", dialCode: "225", trunkPrefix: "0" },
  { code: "XAF", symbol: "FCFA", label: "Central African CFA Franc", dialCode: "237", trunkPrefix: "0" },
  { code: "TZS", symbol: "TSh", label: "Tanzanian Shilling", dialCode: "255", trunkPrefix: "0" },
  { code: "UGX", symbol: "USh", label: "Ugandan Shilling", dialCode: "256", trunkPrefix: "0" },
  { code: "RWF", symbol: "FRw", label: "Rwandan Franc", dialCode: "250", trunkPrefix: "0" },
  { code: "ETB", symbol: "Br", label: "Ethiopian Birr", dialCode: "251", trunkPrefix: "0" },
  { code: "ZMW", symbol: "ZK", label: "Zambian Kwacha", dialCode: "260", trunkPrefix: "0" },
  { code: "MWK", symbol: "MK", label: "Malawian Kwacha", dialCode: "265", trunkPrefix: "0" },
  { code: "MZN", symbol: "MT", label: "Mozambican Metical", dialCode: "258", trunkPrefix: "0" },
  { code: "BWP", symbol: "P", label: "Botswana Pula", dialCode: "267", trunkPrefix: "0" },
  { code: "NAD", symbol: "N$", label: "Namibian Dollar", dialCode: "264", trunkPrefix: "0" },
  { code: "SZL", symbol: "E", label: "Eswatini Lilangeni", dialCode: "268", trunkPrefix: "0" },
  { code: "LSL", symbol: "L", label: "Lesotho Loti", dialCode: "266", trunkPrefix: "0" },
  { code: "MGA", symbol: "Ar", label: "Malagasy Ariary", dialCode: "261", trunkPrefix: "0" },
  { code: "MUR", symbol: "₨", label: "Mauritian Rupee", dialCode: "230", trunkPrefix: "0" },
  { code: "SCR", symbol: "₨", label: "Seychellois Rupee", dialCode: "248", trunkPrefix: "0" },
  { code: "SOS", symbol: "S", label: "Somali Shilling", dialCode: "252", trunkPrefix: "0" },
  { code: "SDG", symbol: "ج.س", label: "Sudanese Pound", dialCode: "249", trunkPrefix: "0" },
  { code: "SSP", symbol: "£", label: "South Sudanese Pound", dialCode: "211", trunkPrefix: "0" },
  { code: "DZD", symbol: "دج", label: "Algerian Dinar", dialCode: "213", trunkPrefix: "0" },
  { code: "MAD", symbol: "د.م.", label: "Moroccan Dirham", dialCode: "212", trunkPrefix: "0" },
  { code: "TND", symbol: "د.ت", label: "Tunisian Dinar", dialCode: "216", trunkPrefix: "0" },
  { code: "LYD", symbol: "ل.د", label: "Libyan Dinar", dialCode: "218", trunkPrefix: "0" },
  { code: "CVE", symbol: "$", label: "Cape Verdean Escudo", dialCode: "238", trunkPrefix: "0" },
  { code: "GMD", symbol: "D", label: "Gambian Dalasi", dialCode: "220", trunkPrefix: "0" },
  { code: "GNF", symbol: "FG", label: "Guinean Franc", dialCode: "224", trunkPrefix: "0" },
  { code: "LRD", symbol: "$", label: "Liberian Dollar", dialCode: "231", trunkPrefix: "0" },
  { code: "SLL", symbol: "Le", label: "Sierra Leonean Leone", dialCode: "232", trunkPrefix: "0" },
  { code: "MRU", symbol: "UM", label: "Mauritanian Ouguiya", dialCode: "222", trunkPrefix: "0" },

  // =========================
  // ASIA
  // =========================

  { code: "INR", symbol: "₹", label: "Indian Rupee", dialCode: "91", trunkPrefix: "0" },
  { code: "PKR", symbol: "Rs", label: "Pakistani Rupee", dialCode: "92", trunkPrefix: "0" },
  { code: "BDT", symbol: "৳", label: "Bangladeshi Taka", dialCode: "880", trunkPrefix: "0" },
  { code: "LKR", symbol: "Rs", label: "Sri Lankan Rupee", dialCode: "94", trunkPrefix: "0" },
  { code: "NPR", symbol: "रू", label: "Nepalese Rupee", dialCode: "977", trunkPrefix: "0" },
  { code: "BTN", symbol: "Nu.", label: "Bhutanese Ngultrum", dialCode: "975", trunkPrefix: "0" },
  { code: "MVR", symbol: "Rf", label: "Maldivian Rufiyaa", dialCode: "960", trunkPrefix: "0" },
  { code: "AFN", symbol: "؋", label: "Afghan Afghani", dialCode: "93", trunkPrefix: "0" },
  { code: "IRR", symbol: "﷼", label: "Iranian Rial", dialCode: "98", trunkPrefix: "0" },
  { code: "IQD", symbol: "ع.د", label: "Iraqi Dinar", dialCode: "964", trunkPrefix: "0" },
  { code: "BHD", symbol: ".د.ب", label: "Bahraini Dinar", dialCode: "973", trunkPrefix: "0" },
  { code: "OMR", symbol: "﷼", label: "Omani Rial", dialCode: "968", trunkPrefix: "0" },
  { code: "YER", symbol: "﷼", label: "Yemeni Rial", dialCode: "967", trunkPrefix: "0" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen", dialCode: "81", trunkPrefix: "0" },
  { code: "CNY", symbol: "¥", label: "Chinese Yuan", dialCode: "86", trunkPrefix: "0" },
  { code: "KRW", symbol: "₩", label: "South Korean Won", dialCode: "82", trunkPrefix: "0" },
  { code: "TWD", symbol: "NT$", label: "New Taiwan Dollar", dialCode: "886", trunkPrefix: "0" },
  { code: "HKD", symbol: "HK$", label: "Hong Kong Dollar", dialCode: "852", trunkPrefix: "0" },
  { code: "MOP", symbol: "MOP$", label: "Macanese Pataca", dialCode: "853", trunkPrefix: "0" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar", dialCode: "65", trunkPrefix: "0" },
  { code: "MYR", symbol: "RM", label: "Malaysian Ringgit", dialCode: "60", trunkPrefix: "0" },
  { code: "IDR", symbol: "Rp", label: "Indonesian Rupiah", dialCode: "62", trunkPrefix: "0" },
  { code: "PHP", symbol: "₱", label: "Philippine Peso", dialCode: "63", trunkPrefix: "0" },
  { code: "THB", symbol: "฿", label: "Thai Baht", dialCode: "66", trunkPrefix: "0" },
  { code: "VND", symbol: "₫", label: "Vietnamese Dong", dialCode: "84", trunkPrefix: "0" },
  { code: "KHR", symbol: "៛", label: "Cambodian Riel", dialCode: "855", trunkPrefix: "0" },
  { code: "LAK", symbol: "₭", label: "Lao Kip", dialCode: "856", trunkPrefix: "0" },
  { code: "MMK", symbol: "K", label: "Myanmar Kyat", dialCode: "95", trunkPrefix: "0" },
  { code: "MNT", symbol: "₮", label: "Mongolian Tugrik", dialCode: "976", trunkPrefix: "0" },
  { code: "KZT", symbol: "₸", label: "Kazakhstani Tenge", dialCode: "7", trunkPrefix: "8" },
  { code: "UZS", symbol: "лв", label: "Uzbekistani Som", dialCode: "998", trunkPrefix: "0" },
  { code: "KGS", symbol: "лв", label: "Kyrgyzstani Som", dialCode: "996", trunkPrefix: "0" },
  { code: "TJS", symbol: "SM", label: "Tajikistani Somoni", dialCode: "992", trunkPrefix: "0" },
  { code: "AZN", symbol: "₼", label: "Azerbaijani Manat", dialCode: "994", trunkPrefix: "0" },
  { code: "GEL", symbol: "₾", label: "Georgian Lari", dialCode: "995", trunkPrefix: "0" },

  // =========================
  // MIDDLE EAST
  // =========================

  { code: "AED", symbol: "د.إ", label: "UAE Dirham", dialCode: "971", trunkPrefix: "0" },
  { code: "SAR", symbol: "﷼", label: "Saudi Riyal", dialCode: "966", trunkPrefix: "0" },
  { code: "QAR", symbol: "﷼", label: "Qatari Riyal", dialCode: "974", trunkPrefix: "0" },
  { code: "KWD", symbol: "د.ك", label: "Kuwaiti Dinar", dialCode: "965", trunkPrefix: "0" },
  { code: "JOD", symbol: "د.ا", label: "Jordanian Dinar", dialCode: "962", trunkPrefix: "0" },
  { code: "ILS", symbol: "₪", label: "Israeli New Shekel", dialCode: "972", trunkPrefix: "0" },
  { code: "LBP", symbol: "ل.ل", label: "Lebanese Pound", dialCode: "961", trunkPrefix: "0" },
  { code: "SYP", symbol: "£", label: "Syrian Pound", dialCode: "963", trunkPrefix: "0" },

  // =========================
  // EUROPE
  // =========================

  { code: "EUR", symbol: "€", label: "Euro", dialCode: "", trunkPrefix: "0" },
  { code: "GBP", symbol: "£", label: "British Pound", dialCode: "44", trunkPrefix: "0" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc", dialCode: "41", trunkPrefix: "0" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona", dialCode: "46", trunkPrefix: "0" },
  { code: "NOK", symbol: "kr", label: "Norwegian Krone", dialCode: "47", trunkPrefix: "0" },
  { code: "DKK", symbol: "kr", label: "Danish Krone", dialCode: "45", trunkPrefix: "0" },
  { code: "ISK", symbol: "kr", label: "Icelandic Krona", dialCode: "354", trunkPrefix: "0" },
  { code: "PLN", symbol: "zł", label: "Polish Zloty", dialCode: "48", trunkPrefix: "0" },
  { code: "CZK", symbol: "Kč", label: "Czech Koruna", dialCode: "420", trunkPrefix: "0" },
  { code: "HUF", symbol: "Ft", label: "Hungarian Forint", dialCode: "36", trunkPrefix: "06" },
  { code: "RON", symbol: "lei", label: "Romanian Leu", dialCode: "40", trunkPrefix: "0" },
  { code: "BGN", symbol: "лв", label: "Bulgarian Lev", dialCode: "359", trunkPrefix: "0" },
  { code: "RSD", symbol: "дин.", label: "Serbian Dinar", dialCode: "381", trunkPrefix: "0" },
  { code: "HRK", symbol: "kn", label: "Croatian Kuna", dialCode: "385", trunkPrefix: "0" },
  { code: "TRY", symbol: "₺", label: "Turkish Lira", dialCode: "90", trunkPrefix: "0" },
  { code: "UAH", symbol: "₴", label: "Ukrainian Hryvnia", dialCode: "380", trunkPrefix: "0" },
  { code: "MDL", symbol: "L", label: "Moldovan Leu", dialCode: "373", trunkPrefix: "0" },
  { code: "GIP", symbol: "£", label: "Gibraltar Pound", dialCode: "350", trunkPrefix: "0" },

  // =========================
  // NORTH AMERICA
  // =========================

  { code: "USD", symbol: "$", label: "US Dollar", dialCode: "1", trunkPrefix: "" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar", dialCode: "1", trunkPrefix: "" },
  { code: "MXN", symbol: "$", label: "Mexican Peso", dialCode: "52", trunkPrefix: "0" },
  { code: "GTQ", symbol: "Q", label: "Guatemalan Quetzal", dialCode: "502", trunkPrefix: "0" },
  { code: "CRC", symbol: "₡", label: "Costa Rican Colon", dialCode: "506", trunkPrefix: "0" },
  { code: "DOP", symbol: "RD$", label: "Dominican Peso", dialCode: "1", trunkPrefix: "" },
  { code: "JMD", symbol: "J$", label: "Jamaican Dollar", dialCode: "1", trunkPrefix: "" },
  { code: "HTG", symbol: "G", label: "Haitian Gourde", dialCode: "509", trunkPrefix: "0" },

  // =========================
  // SOUTH AMERICA
  // =========================

  { code: "BRL", symbol: "R$", label: "Brazilian Real", dialCode: "55", trunkPrefix: "0" },
  { code: "ARS", symbol: "$", label: "Argentine Peso", dialCode: "54", trunkPrefix: "0" },
  { code: "COP", symbol: "$", label: "Colombian Peso", dialCode: "57", trunkPrefix: "0" },
  { code: "PEN", symbol: "S/", label: "Peruvian Sol", dialCode: "51", trunkPrefix: "0" },
  { code: "CLP", symbol: "$", label: "Chilean Peso", dialCode: "56", trunkPrefix: "0" },
  { code: "BOB", symbol: "Bs", label: "Bolivian Boliviano", dialCode: "591", trunkPrefix: "0" },
  { code: "PYG", symbol: "₲", label: "Paraguayan Guarani", dialCode: "595", trunkPrefix: "0" },
  { code: "UYU", symbol: "$U", label: "Uruguayan Peso", dialCode: "598", trunkPrefix: "0" },
  { code: "VES", symbol: "Bs.S", label: "Venezuelan Bolívar", dialCode: "58", trunkPrefix: "0" },
  { code: "GYD", symbol: "$", label: "Guyanese Dollar", dialCode: "592", trunkPrefix: "0" },
  { code: "SRD", symbol: "$", label: "Surinamese Dollar", dialCode: "597", trunkPrefix: "0" },

  // =========================
  // OCEANIA
  // =========================

  { code: "AUD", symbol: "A$", label: "Australian Dollar", dialCode: "61", trunkPrefix: "0" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar", dialCode: "64", trunkPrefix: "0" },
  { code: "FJD", symbol: "FJ$", label: "Fijian Dollar", dialCode: "679", trunkPrefix: "0" },
  { code: "PGK", symbol: "K", label: "Papua New Guinean Kina", dialCode: "675", trunkPrefix: "0" },
  { code: "WST", symbol: "T", label: "Samoan Tala", dialCode: "685", trunkPrefix: "0" },
  { code: "TOP", symbol: "T$", label: "Tongan Paʻanga", dialCode: "676", trunkPrefix: "0" },
  { code: "SBD", symbol: "$", label: "Solomon Islands Dollar", dialCode: "677", trunkPrefix: "0" },
];

export function currencyInfo(code) {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

// Kept as the default formatter used before multi-currency existed —
// still used anywhere a business's currency isn't available.
export function naira(n) {
  return formatMoney(n, "NGN");
}

export function formatMoney(n, currencyCode) {
  const v = Math.round(Number(n) || 0);
  const info = currencyInfo(currencyCode);
  return info.symbol + v.toLocaleString("en-US");
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return "Today, " + d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday, " + d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

export function waLink(phone, text, currencyCode) {
  const info = currencyInfo(currencyCode);
  let digits = (phone || "").replace(/\D/g, "");
  const trunk = info.trunkPrefix;
  if (trunk && digits.startsWith(trunk)) digits = info.dialCode + digits.slice(trunk.length);
  else if (!digits.startsWith(info.dialCode)) digits = info.dialCode + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
   }
