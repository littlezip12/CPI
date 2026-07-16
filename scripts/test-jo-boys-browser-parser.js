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
function requireCondition(condition, message) { if (!condition) throw new Error(message); }
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
  requireCondition(fs.existsSync(snapshot), `Missing browser snapshot ${divisionId}`);
  const games = context.parseLive(fs.readFileSync(snapshot, "utf8"));
  requireCondition(games.length === expectedGames, `${divisionId} browser parser expected ${expectedGames} games, found ${games.length}`);
  requireCondition(games.every(game => game.whiteScore === "" && game.darkScore === ""), `${divisionId} contains a pre-tournament score`);
  requireCondition(new Set(games.map(game => `${game.gmid}|${game.game}`)).size === games.length, `${divisionId} browser parser produced duplicate games`);
  total += games.length;
}
requireCondition(total === 2133, `Expected 2,133 Boys schedule games, found ${total}`);
console.log("BOYS JO BROWSER PARSER TESTS PASSED");
console.log(" - All 12 verified snapshots parse in the public application");
console.log(" - Lettered games such as 5A and 140A remain distinct schedule records");
console.log(" - 2,133 scheduled games contain no pre-tournament scores or duplicates");
