#!/usr/bin/env node
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function requireCondition(condition, message) { if (!condition) throw new Error(message); }
function element(value = "") {
  return {
    innerHTML: "",
    textContent: "",
    value,
    insertAdjacentHTML(_position, html) { this.innerHTML += html; },
    addEventListener() {},
  };
}

const elements = {
  "#sourceHealthRows": element(),
  "#healthEvent": element("all"),
  "#healthStatus": element("all"),
  "#healthPhase": element("all"),
  "#healthSearch": element(""),
  "#sourceHealthStats": element(),
  "#healthGenerated": element(),
  "#healthCount": element(),
  "#healthPolicy": element("Default policy"),
};
const document = { querySelector(selector) { return elements[selector] || null; } };
const window = {};
const context = { window, document, console, Date };
vm.createContext(context);
for (const rel of ["data/tournaments/health/runtime.js", "js/tournament-source-health.js"]) {
  vm.runInContext(read(rel), context, { filename: rel });
}
requireCondition(elements["#sourceHealthRows"].innerHTML.includes("14U Girls Championship"), "Source health dashboard did not render the banked JO division");
requireCondition(elements["#sourceHealthRows"].innerHTML.includes("0 completed"), "Source health dashboard must distinguish completed from scheduled games");
requireCondition(elements["#sourceHealthStats"].innerHTML.includes("JO divisions"), "Source health summary cards did not render");
requireCondition(elements["#healthPolicy"].textContent.includes("One registered source"), "Source health policy did not render");

console.log("TOURNAMENT SOURCE HEALTH UI TESTS PASSED");
console.log(" - Registered divisions render with source, schedule, freshness, and status");
console.log(" - Scheduled and completed game counts remain distinct");
