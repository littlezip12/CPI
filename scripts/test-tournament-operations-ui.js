#!/usr/bin/env node
"use strict";
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };
function element(value = "") { return { innerHTML: "", textContent: "", value, insertAdjacentHTML(_position, html) { this.innerHTML += html; }, addEventListener() {} }; }
const elements = {
  "#opsRows": element(), "#opsEvent": element("all"), "#opsMode": element("all"), "#opsStatus": element("all"), "#opsAge": element("all"), "#opsSearch": element(""),
  "#opsGenerated": element(), "#opsOverall": element(), "#opsStats": element(), "#opsAlertBanner": element(), "#opsEvents": element(), "#opsCount": element(),
};
const document = { querySelector(selector) { return elements[selector] || null; } };
const window = {};
const context = { window, document, console, Date };
vm.createContext(context);
for (const rel of ["data/tournaments/operations/runtime.js", "js/tournament-operations-v7-47.js"]) vm.runInContext(read(rel), context, { filename: rel });
requireCondition(elements["#opsRows"].innerHTML.includes("14U Girls Championship"), "Operations UI did not render Weekend 1 divisions");
requireCondition(elements["#opsRows"].innerHTML.includes("14U Boys Classic"), "Operations UI did not render Weekend 2 divisions");
requireCondition(elements["#opsRows"].innerHTML.includes("Archive pending") || elements["#opsRows"].innerHTML.includes("Archived"), "Operations UI did not distinguish completed-event archive status");
requireCondition(elements["#opsStats"].innerHTML.includes("Live divisions"), "Operations UI summary did not render");
const alertCount = (window.CPI_TOURNAMENT_OPERATIONS.alerts || []).length;
requireCondition(elements["#opsAlertBanner"].innerHTML.includes(alertCount ? "operational alert" : "No live operational alerts"), "Operations UI alert banner did not match the runtime alert state");
requireCondition(elements["#opsEvents"].innerHTML.includes("Quiksilver Cup"), "Operations UI did not render all registered tournaments");
console.log("TOURNAMENT OPERATIONS UI TESTS PASSED");
console.log(" - Both JO weekends render in one live control room");
console.log(" - Completed tournaments remain visible as archive data without being misrepresented as live-monitored");
console.log(" - Summary, alert, event, and division views render from the generated runtime");
