#!/usr/bin/env node
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");
const root = path.resolve(__dirname, "..");
const code = fs.readFileSync(path.join(root, "js/sponsor-framework-v7-53-2.js"), "utf8");

function run(campaigns) {
  const inserted = [];
  const mount = { insertAdjacentElement(position, node) { inserted.push({ position, node }); } };
  class Element {
    constructor(tag) { this.tagName = tag; this.dataset = {}; this.attributes = {}; this.className = ""; this.innerHTML = ""; }
    setAttribute(name, value) { this.attributes[name] = value; }
    remove() { this.removed = true; }
  }
  const classes = new Set();
  const document = {
    currentScript: { src: "https://littlezip12.github.io/CPI/js/sponsor-framework-v7-53-2.js?v=7.53.4" },
    readyState: "complete",
    body: { classList: { contains() { return false; } } },
    documentElement: { classList: { add(value) { classes.add(value); }, remove(value) { classes.delete(value); } } },
    createElement(tag) { return new Element(tag); },
    querySelector(selector) {
      if (selector === ".rankings-hero") return mount;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    dispatchEvent() {},
  };
  const config = {
    release: "7.53.2",
    disclosure: "Sponsorship never influences WPI rankings, results, placements, or editorial decisions.",
    outboundAttribution: { source: "waterpoloindex", medium: "sponsor", campaignParameter: "utm_campaign", placementParameter: "utm_content" },
    placements: [{ id: "rankings.presenting", pageTypes: ["rankings"], label: "Rankings Presented by", format: "presenting", mount: { selectors: [".rankings-hero"], position: "beforebegin" } }],
    campaigns,
  };
  const window = {
    WPI_SPONSOR_CONFIG: config,
    location: { pathname: "/WPI/rankings.html", search: "", href: "https://littlezip12.github.io/CPI/rankings.html" },
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
  };
  const sandbox = { window, document, URL, URLSearchParams, Date, console, CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } } };
  vm.runInNewContext(code, sandbox, { filename: "sponsor-framework-v7-53-2.js" });
  return { inserted, classes, api: window.WPI_SPONSORS };
}

const empty = run([]);
if (empty.inserted.length !== 0) throw new Error("Empty campaign inventory rendered page space");
if (!empty.api || empty.api.activeCampaignCount() !== 0) throw new Error("Sponsor API did not initialize safely");

const active = run([{
  id: "approved-test",
  name: "Approved Test Partner",
  slug: "approved-test-partner",
  status: "active",
  placements: ["rankings.presenting"],
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  website: "https://example.com/support",
  message: "Supporting youth water polo.",
  cta: "Visit partner",
  priority: 100,
}]);
if (active.inserted.length !== 1) throw new Error(`Expected one sponsor card, found ${active.inserted.length}`);
const html = active.inserted[0].node.innerHTML;
for (const token of [
  "Approved Test Partner",
  "Rankings Presented by",
  "rel=\"sponsored noopener noreferrer\"",
  "utm_source=waterpoloindex",
  "utm_medium=sponsor",
  "utm_campaign=approved-test-partner",
  "utm_content=rankings.presenting",
  "never influences WPI rankings",
]) {
  if (!html.includes(token)) throw new Error(`Rendered sponsor card missing ${token}`);
}
if (!active.classes.has("wpi-has-active-sponsors")) throw new Error("Active sponsor state was not set");
console.log("WPI 7.53.2 sponsor browser runtime check passed.");
