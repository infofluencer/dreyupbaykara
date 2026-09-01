#!/usr/bin/env node
/**
 * Site prefix matcher unit tests (no server required).
 *   npm run test:site-matcher
 */
import assert from "node:assert/strict";
import {
  CAMPAIGN_PREFIX_RE,
  extractCampaignPrefix,
  matchCampaignSite,
} from "../src/lib/marketing/site-matcher.ts";

const prefixMap = [
  { prefix: "BEL", site: "endoskopikbelameliyati" },
  { prefix: "DIZ", site: "dizameliyati" },
];

function ok(label) {
  console.log(`  \x1b[32mOK\x1b[0m    ${label}`);
}

function run() {
  console.log("site-matcher tests\n");

  assert.match("[BEL] Endoskopik Bel - Arama", CAMPAIGN_PREFIX_RE);
  ok("prefix regex matches [BEL] format");

  assert.equal(
    matchCampaignSite("[BEL] Endoskopik Bel - Arama", prefixMap).site,
    "endoskopikbelameliyati",
  );
  ok("auto match BEL → endoskopikbelameliyati");

  assert.equal(
    matchCampaignSite("[BEL] Endoskopik Bel - Arama", prefixMap)
      .siteMatchSource,
    "auto",
  );
  ok("site_match_source auto");

  assert.equal(
    matchCampaignSite("[XYZ] Unknown Campaign", prefixMap).siteMatchSource,
    "unmatched",
  );
  ok("unknown prefix → unmatched");

  assert.equal(
    matchCampaignSite("Organik kampanya adı", prefixMap).siteMatchSource,
    "unmatched",
  );
  ok("no prefix → unmatched");

  assert.equal(
    matchCampaignSite("[diz] Diz Cerrahisi", prefixMap).site,
    "dizameliyati",
  );
  ok("case-insensitive prefix");

  assert.equal(
    extractCampaignPrefix("  [Bel] Test  "),
    "BEL",
  );
  ok("extractCampaignPrefix normalizes");

  console.log("\nAll site-matcher tests passed.");
}

run();
