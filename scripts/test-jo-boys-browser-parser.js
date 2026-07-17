#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const EXPECTED = {
  "10u-championship": 141,
  "12u-boys-championship": 192,
  "12u-boys-classic": 218,
  "14u-boys-championship": 192,
  "14u-boys-classic": 192,
  "14u-boys-invitational": 146,
  "16u-boys-championship": 192,
  "16u-boys-classic": 192,
  "16u-boys-invitational": 192,
  "18u-boys-championship": 192,
  "18u-boys-classic": 192,
  "18u-boys-invitational": 92,
};
const REGRESSION_GAMES = new Map([
  ["10B-091", "91"],
  ["10B-094", "94"],
  ["10B-097", "97"],
  ["10B-140A", "140A"],
]);
function requireCondition(condition, message) { if (!condition) throw new Error(message); }
function gameKey(gmid, game) { return `${String(gmid)}|${String(game)}`; }
const app = fs.readFileSync(path.join(ROOT, "tournaments/jo-boys/app.js"), "utf8");
const start = app.indexOf("function unique(values)");
const end = app.indexOf("function titleTeam");
requireCondition(start >= 0 && end > start, "Could not isolate the Boys JO browser parser");
const context = { console };
vm.createContext(context);
vm.runInContext(app.slice(start, end), context, { filename: "tournaments/jo-boys/app.js#parser" });
let total = 0;
for (const [divisionId, expectedGames] of Object.entries(EXPECTED)) {
  const snapshot = path.join(ROOT, "data/tournaments/raw/2026-jo-weekend-2", `${divisionId}.csv`);
  const normalizedPath = path.join(ROOT, "data/tournaments/normalized/2026-jo-weekend-2", `${divisionId}.json`);
  requireCondition(fs.existsSync(snapshot), `Missing browser snapshot ${divisionId}`);
  requireCondition(fs.existsSync(normalizedPath), `Missing normalized dataset ${divisionId}`);
  const games = context.parseLive(fs.readFileSync(snapshot, "utf8"));
  const normalized = JSON.parse(fs.readFileSync(normalizedPath, "utf8"));
  requireCondition(games.length === expectedGames, `${divisionId} browser parser expected ${expectedGames} games, found ${games.length}`);
  requireCondition(games.every(game => game.whiteScore === "" && game.darkScore === ""), `${divisionId} contains a pre-tournament score`);
  const browserKeys = new Set(games.map(game => gameKey(game.gmid, game.game)));
  const normalizedKeys = new Set((normalized.games || []).map(game => gameKey(game.sourceGameId, game.sourceGameNumber)));
  requireCondition(browserKeys.size === games.length, `${divisionId} browser parser produced duplicate games`);
  const missing = [...normalizedKeys].filter(key => !browserKeys.has(key));
  const extra = [...browserKeys].filter(key => !normalizedKeys.has(key));
  requireCondition(missing.length === 0 && extra.length === 0,
    `${divisionId} browser/normalized game-set mismatch; missing: ${missing.slice(0, 8).join(", ") || "none"}; extra: ${extra.slice(0, 8).join(", ") || "none"}`);
  if (divisionId === "10u-championship") {
    const byGmid = new Map(games.map(game => [game.gmid, String(game.game)]));
    for (const [gmid, gameNumber] of REGRESSION_GAMES) {
      requireCondition(byGmid.get(gmid) === gameNumber, `${gmid} should parse as Game ${gameNumber}, found ${byGmid.get(gmid) || "missing"}`);
    }
  }
  total += games.length;
}
requireCondition(total === 2133, `Expected 2,133 Boys schedule games, found ${total}`);
console.log("BOYS JO BROWSER PARSER TESTS PASSED");
console.log(" - Browser and normalized game sets match across all 12 Boys divisions");
console.log(" - Stage labels such as RR9-11 cannot displace the authoritative GMID");
console.log(" - Games 91, 94, 97, and 140A are retained with correct game numbers");
console.log(" - 2,133 scheduled games contain no pre-tournament scores or duplicates");
