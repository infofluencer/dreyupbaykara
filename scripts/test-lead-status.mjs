#!/usr/bin/env node
/**
 * Lead durum panosu sabitleri (unit).
 *   npm run test:lead-status
 */
import {
  asLeadStatus,
  CLOSED_LEAD_STATUSES,
  isClosedLeadStatus,
  isDoneStatus,
  LEAD_STATUS_FILTERS,
  LEAD_STATUS_LABEL,
  LEAD_STATUS_LABEL_I18N,
  LEAD_STATUS_TONE,
  LEAD_STATUSES,
  statusesForFilter,
} from "../src/lib/crm/lead-status.ts";

let passed = 0;
let failed = 0;

function expect(label, cond, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  \x1b[32mOK\x1b[0m    ${label}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m  ${label}${detail ? `\n         ${detail}` : ""}`);
  }
}

console.log("\n=== Lead statuses ===\n");

expect("7 durum", LEAD_STATUSES.length === 7, `count=${LEAD_STATUSES.length}`);
expect(
  "sıra sabit",
  LEAD_STATUSES.join(",") ===
    "yeni,arandi,randevulu,muayene_edildi,ameliyat_olacak,ameliyat_edildi,bitti",
  LEAD_STATUSES.join(","),
);

for (const key of LEAD_STATUSES) {
  expect(`label TR: ${key}`, Boolean(LEAD_STATUS_LABEL[key]));
  expect(`tone: ${key}`, Boolean(LEAD_STATUS_TONE[key]));
  expect(`i18n tr: ${key}`, Boolean(LEAD_STATUS_LABEL_I18N.tr[key]));
  expect(`i18n en: ${key}`, Boolean(LEAD_STATUS_LABEL_I18N.en[key]));
  expect(`i18n ar: ${key}`, Boolean(LEAD_STATUS_LABEL_I18N.ar[key]));
}

expect(
  "filtreler 7 durum + tümü",
  LEAD_STATUS_FILTERS.length === 8 && LEAD_STATUS_FILTERS[0].id === "all",
);

expect("asLeadStatus muayene_edildi", asLeadStatus("muayene_edildi") === "muayene_edildi");
expect("asLeadStatus ameliyat_olacak", asLeadStatus("ameliyat_olacak") === "ameliyat_olacak");
expect("asLeadStatus ameliyat_edildi", asLeadStatus("ameliyat_edildi") === "ameliyat_edildi");
expect("legacy muayeneye_geldi → muayene_edildi", asLeadStatus("muayeneye_geldi") === "muayene_edildi");
expect("legacy ameliyat_karari → ameliyat_olacak", asLeadStatus("ameliyat_karari") === "ameliyat_olacak");
expect("legacy ameliyat_oldu → ameliyat_edildi", asLeadStatus("ameliyat_oldu") === "ameliyat_edildi");
expect("bilinmeyen → yeni", asLeadStatus("xyz") === "yeni");

expect("kapalı yalnızca bitti", CLOSED_LEAD_STATUSES.join(",") === "bitti");
expect("isClosedLeadStatus bitti", isClosedLeadStatus("bitti"));
expect("isClosedLeadStatus ameliyat_edildi false", !isClosedLeadStatus("ameliyat_edildi"));
expect("isDoneStatus yalnızca bitti", isDoneStatus("bitti") && !isDoneStatus("ameliyat_edildi"));

expect(
  "statusesForFilter ameliyat_olacak",
  statusesForFilter("ameliyat_olacak")?.join(",") === "ameliyat_olacak",
);
expect("statusesForFilter all", statusesForFilter("all") === null);

console.log(`\nSonuç: ${passed} geçti, ${failed} kaldı\n`);
process.exit(failed ? 1 : 0);
