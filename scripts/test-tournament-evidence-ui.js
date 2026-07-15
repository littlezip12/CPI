#!/usr/bin/env node
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function testTeamProfile() {
  const root = { innerHTML: "" };
  const style = { setProperty() {} };
  const document = {
    title: "",
    documentElement: { style },
    querySelector(selector) {
      if (selector === "#teamProfile") return root;
      if (selector === ".team-profile-page") return { style };
      return null;
    },
  };
  const window = { location: { search: "?team=908-14u-girls", href: "http://localhost/team.html?team=908-14u-girls" } };
  const context = { window, document, URLSearchParams, URL, console };
  vm.createContext(context);
  for (const rel of ["data.js", "data/tournaments/evidence/runtime.js", "js/team-profile-v7-42.js"]) {
    vm.runInContext(read(rel), context, { filename: rel });
  }
  requireCondition(root.innerHTML.includes("Normalized tournament evidence"), "Team profile evidence section did not render");
  requireCondition(root.innerHTML.includes("JO Seed #3"), "Team profile did not render the separate JO seed");
  requireCondition(root.innerHTML.includes("Profile evidence only"), "Team profile ranking-safety label is missing");
}

function element(value = "") {
  return {
    innerHTML: "",
    textContent: "",
    value,
    insertAdjacentHTML(_position, html) { this.innerHTML += html; },
    addEventListener() {},
  };
}

function testReviewDashboard() {
  const elements = {
    "#rankingReviewList": element(),
    "#identityReviewList": element(),
    "#evidenceGroup": element("all"),
    "#evidenceStatus": element("all"),
    "#evidenceSearch": element(""),
    "#evidenceStats": element(),
    "#rankingCount": element(),
    "#identityCount": element(),
  };
  const document = { querySelector(selector) { return elements[selector] || null; } };
  const window = {};
  const context = { window, document, console };
  vm.createContext(context);
  for (const rel of ["data/tournaments/evidence/review-runtime.js", "js/tournament-evidence-v7-42.js"]) {
    vm.runInContext(read(rel), context, { filename: rel });
  }
  requireCondition(elements["#rankingReviewList"].innerHTML.includes("908"), "Ranking review dashboard did not render canonical teams");
  requireCondition(elements["#identityReviewList"].innerHTML.includes("TOPAZ"), "Identity review dashboard did not render tournament-only teams");
}

testTeamProfile();
testReviewDashboard();
console.log("TOURNAMENT EVIDENCE UI TESTS PASSED");
console.log(" - Team profiles render banked evidence and separate JO seeds");
console.log(" - Ranking review and tournament-only identity queues render from generated runtimes");
