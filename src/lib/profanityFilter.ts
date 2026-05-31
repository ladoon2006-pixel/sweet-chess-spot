// فیلتر کلمات نامناسب فارسی
// لیست کلمات: حروف عربی/فارسی هر دو پشتیبانی می‌شن

const BAD_WORDS = [
  "کیر","کس","کون","جنده","جنده","ساک","حرومزاده","حروم زاده","بی ناموس","بی‌ناموس",
  "مادرجنده","مادر جنده","کس کش","کسکش","کیرم","کیری","کونی","کونده","کوس","کصافت",
  "خارکسده","خارکس","ننتو","ننه‌ت","حروم‌زاده","پدرسگ","پدر سگ","دیوث","دیوس",
  "اوبی","اوبنه","قرمساق","فاحشه","لاشی","لاشخور","کسخل","کس خل","قحبه",
  "گاییدم","گاییده","گاییدن","گه","گوه","تخمی","تخم سگ","ننه جنده","کص","کصکش",
];

// نرمال‌سازی متن: تبدیل حروف عربی به فارسی، حذف فاصله‌های پنهان
function normalize(s: string): string {
  return s
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, "") // ZWNJ
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function containsProfanity(text: string): boolean {
  const n = normalize(text);
  return BAD_WORDS.some((w) => n.includes(normalize(w)));
}

export function findProfanity(text: string): string | null {
  const n = normalize(text);
  for (const w of BAD_WORDS) {
    if (n.includes(normalize(w))) return w;
  }
  return null;
}
