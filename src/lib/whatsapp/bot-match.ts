export type BotFaqMatchInput = {
  question: string;
  answer: string;
  keywords: string[] | null;
  sort_order?: number | null;
};

export type BotFaqHit = {
  question: string;
  answer: string;
  keyword: string;
  score: number;
};

export type BotLang = "tr" | "en" | "ar" | "unknown";

const ARABIC_LETTER = /[\u0600-\u06FF]/;

/** TR / EN / AR karşılaştırma: İ/ı, ş… ve Arapça hareke/elif birleşir. */
export function foldForMatch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("â", "a");
}

/** Fold sonrası isim ekleri: ücretiniz, fiyatı. ücretsiz (siz) tutmaz. */
const NOUN_SUFFIX = /^(i|in|iniz|si|ler|leri|niz)?$/;

function stripArArticle(token: string): string {
  return token.startsWith("ال") && token.length > 4 ? token.slice(2) : token;
}

export function keywordHits(message: string, keyword: string): boolean {
  const haystack = foldForMatch(message);
  const needle = foldForMatch(keyword);
  if (!haystack || !needle) return false;
  if (needle.includes(" ")) return haystack.includes(needle);

  const needleBare = stripArArticle(needle);
  return haystack.split(/\s+/).some((token) => {
    const bare = stripArArticle(token);
    if (token === needle || bare === needle || bare === needleBare) return true;
    if (needleBare.length < 4 || !bare.startsWith(needleBare)) return false;
    return NOUN_SUFFIX.test(bare.slice(needleBare.length));
  });
}

export function faqLang(
  faq: Pick<BotFaqMatchInput, "question" | "answer">,
): "tr" | "en" | "ar" {
  if (ARABIC_LETTER.test(faq.question)) return "ar";
  if (/[çğıöşüÇĞİÖŞÜ]/.test(faq.question)) return "tr";
  return "en";
}

const ARABIZI =
  /\b(wein|wayn|wyn|fein|feen|fyn|qedesh|qadesh|qaddesh|shu|shno|shino|shloun|shlown|maw3ed|maw3id|ta2meen|3iyada|3yada|se3r|si3r|se3er|raneen|kif|keef|7ajz|hajz|fatq|raqaba)\b/;

export function messageLang(text: string): BotLang {
  if (ARABIC_LETTER.test(text)) return "ar";
  const folded = foldForMatch(text);
  if (ARABIZI.test(folded)) return "ar";
  if (/[çğıöşüÇĞİÖŞÜ]/.test(text)) return "tr";
  const enPhrases = /(how much|where is|where are you|free mri|book a|appointment)/.test(
    folded,
  );
  const en =
    folded.match(
      /\b(the|you|your|please|hello|hi|is|are|do|does|can|how|what|where|price|cost|fee|mri|surgery|doctor|appointment|insurance|clinic|hospital)\b/g,
    )?.length ?? 0;
  const tr =
    folded.match(
      /\b(mi|mu|misiniz|nedir|nasil|nerede|nerde|konum|adres|fiyat|ucret|randevu|ameliyat|fitik|kayma|sgk|var|yok|merhaba|selam|lütfen)\b/g,
    )?.length ?? 0;
  if (enPhrases && en >= tr) return "en";
  if (en >= 2 && en > tr) return "en";
  if (tr >= 1 && tr >= en) return "tr";
  if (en >= 1 && tr === 0) return "en";
  return "unknown";
}

function scoreFaqs(message: string, faqs: BotFaqMatchInput[]): Array<BotFaqHit & { sort_order: number }> {
  const scored: Array<BotFaqHit & { sort_order: number }> = [];

  for (const faq of faqs) {
    let bestKeyword: string | null = null;
    let bestScore = 0;
    for (const keyword of faq.keywords ?? []) {
      if (!keywordHits(message, keyword)) continue;
      const score = foldForMatch(keyword).length;
      if (score > bestScore) {
        bestScore = score;
        bestKeyword = keyword;
      }
    }
    if (!bestKeyword) continue;
    scored.push({
      question: faq.question,
      answer: faq.answer,
      keyword: bestKeyword,
      score: bestScore,
      sort_order: faq.sort_order ?? 0,
    });
  }

  scored.sort((a, b) => b.score - a.score || a.sort_order - b.sort_order);
  return scored;
}

/**
 * Mesajdaki SSS eşleşmeleri.
 * - Tek kelime: kelime sınırı (ücret ≠ ücretsiz)
 * - Çok kelime: ifade geçerse
 * - Dil: TR / EN / AR soru → aynı dildeki SSS
 * - Sıra: en uzun keyword, eşitlikte sort_order
 * - limit: çok niyetli mesajda birden fazla cevap (ör. fiyat + SGK)
 */
export function matchBotFaqs(
  message: string,
  faqs: BotFaqMatchInput[],
  limit = 2,
): BotFaqHit[] {
  const lang = messageLang(message);
  const localized =
    lang === "unknown" ? faqs : faqs.filter((faq) => faqLang(faq) === lang);
  const scored = scoreFaqs(
    message,
    localized.length ? localized : faqs,
  );
  const hits = scored.length || lang === "unknown" ? scored : scoreFaqs(message, faqs);

  return hits
    .slice(0, Math.max(1, limit))
    .map(({ sort_order: _, ...hit }) => hit);
}

export function composeBotReply(hits: BotFaqHit[]): string | undefined {
  if (!hits.length) return undefined;
  return [...new Set(hits.map((hit) => hit.answer))].join("\n\n");
}
