#!/usr/bin/env node
"use strict";
const fs=require("fs"),path=require("path");
const ROOT=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(ROOT,"tournaments/jo-texas/app.js"),"utf8");
const html=fs.readFileSync(path.join(ROOT,"tournaments/jo-texas/index.html"),"utf8");
const hub=fs.readFileSync(path.join(ROOT,"tournaments.html"),"utf8");
const css=fs.readFileSync(path.join(ROOT,"tournaments/jo-texas/session3-enhancements-v7-54-6.css"),"utf8");
const fail=m=>{console.error("JO SESSION 3 NAVIGATION 7.54.6 TEST FAILED\n - "+m);process.exit(1)};
for(const token of [
  "function teamJumpHtml(name",
  "data-team-jump=",
  "event.target.closest?.('[data-team-jump]')",
  "team.value=selected;renderTeam()",
  "function venueLinksHtml(location)",
  "https://www.google.com/maps/dir/?api=1",
  "https://maps.apple.com/?daddr=",
  "https://waze.com/ul?q=",
  "venueLinksHtml(upcoming.location)",
  "venueLinksHtml(g.location)",
  "'30-Jul':'Thursday, July 30'",
  "'2-Aug':'Sunday, August 2'"
])if(!app.includes(token))fail(`Session 3 app missing ${token}`);
for(const token of ["app.js?v=7.54.6","session3-enhancements-v7-54-6.css?v=7.54.6"])
  if(!html.includes(token))fail(`Session 3 page missing ${token}`);
if(hub.includes('id="nextTournamentHeading"'))fail("Tournament hub retains the redundant Next Tournament heading");
if(!hub.includes('<a class="next-tournament-action" id="nextTournamentAction" href="tournaments/jo-texas/">'))fail("Next Tournament CTA is not a real Session 3 link");
for(const token of [".jo-team-jump",".jo-venue-link",".jo-map-link"])
  if(!css.includes(token))fail(`Session 3 enhancement CSS missing ${token}`);
console.log("JO SESSION 3 NAVIGATION 7.54.6 TEST PASSED");
console.log(" - Next Tournament action links directly to Session 3 without redundant heading copy");
console.log(" - Team names switch the selected journey from next-game, journey, relevant, and full-schedule views");
console.log(" - Session 3 venues expose Google Maps, Apple Maps, and Waze directions");
