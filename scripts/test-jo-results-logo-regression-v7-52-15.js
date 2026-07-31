#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'data/identity/runtime.js'), 'utf8'), context, { filename: 'data/identity/runtime.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'js/cpi-identity.js'), 'utf8'), context, { filename: 'js/cpi-identity.js' });
vm.runInContext(fs.readFileSync(path.join(root, 'data/tournaments/jo-profile-runtime.js'), 'utf8'), context, { filename: 'data/tournaments/jo-profile-runtime.js' });

const resolver = context.window.CPIIdentity;
const joProfiles = context.window.WPI_JO_PROFILES || { teams: {}, lookup: {} };
const results = JSON.parse(fs.readFileSync(path.join(root, 'data/tournaments/jo-results-2026.json'), 'utf8'));
const rankings = JSON.parse(fs.readFileSync(path.join(root, 'rankings.json'), 'utf8'));
const clubs = JSON.parse(fs.readFileSync(path.join(root, 'clubs.json'), 'utf8'));
const browserSource = fs.readFileSync(path.join(root, 'js/jo-results-browser-v7-52-1.js'), 'utf8');
const tournamentsHtml = fs.readFileSync(path.join(root, 'tournaments.html'), 'utf8');

function fail(message) {
  throw new Error(message);
}

for (const token of [
  'const usableLogo = (value)',
  'const rankedLogo = usableLogo(ranked?.logo)',
  'const joProfileLogo = usableLogo(joProfile?.logo)',
  'const clubLogo = usableLogo(club?.logo)',
  'logo: rankedLogo || joProfileLogo || clubLogo || fallbackLogo',
  'profile: joProfile?.teamPage',
]) {
  if (!browserSource.includes(token)) fail(`JO results browser is missing regression guard: ${token}`);
}
if (browserSource.includes('if (joProfile) return { logo: joProfile.logo || fallbackLogo')) {
  fail('JO profile routing is still allowed to short-circuit club logo resolution.');
}
if (!tournamentsHtml.includes('js/tournament-hub-v7-54-4.js?v=7.54.8')) {
  fail('tournaments.html does not load the canonical-logo public archive.');
}
const hubSource = fs.readFileSync(path.join(root, 'js/tournament-hub-v7-54-4.js'), 'utf8');
for (const token of ['joAsset', 'window.CPIIdentity?.resolveTeam', 'window.CPIIdentity?.resolveClub', 'window.WPI_JO_PROFILES']) {
  if (!hubSource.includes(token)) fail(`public archive missing ${token}`);
}

const normalize = (value) => String(value ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function candidateNames(name) {
  const clean = resolver.cleanSourceName?.(name) || String(name || '').trim();
  const values = [clean];
  const add = (value) => {
    const candidate = String(value || '').trim();
    if (candidate && !values.includes(candidate)) values.push(candidate);
  };
  add(clean.replace(/\s+\d{1,2}[A-Z]?\s*$/i, ''));
  let stripped = clean;
  for (let index = 0; index < 3; index += 1) {
    const next = stripped.replace(/\s+(?:A|B|C|D|Black|Blue|Red|White|Gold|Silver|Orange|Green|Teal|Yellow|Navy|Gray|Grey|Premier|13A)\s*$/i, '').trim();
    if (next === stripped) break;
    add(next);
    stripped = next;
  }
  return values;
}

function rankedTeamFor(name, group) {
  const target = normalize(name);
  const groupLabel = normalize(group?.label || '');
  return rankings.find((team) => normalize(team.team) === target && normalize(team.group) === groupLabel)
    || rankings.find((team) => normalize(team.team) === target)
    || null;
}

function clubFor(name, group) {
  const identity = resolver.resolveTeam?.(name, {
    season: '2026',
    ageGroup: group?.ageGroup || '',
    gender: group?.category || '',
  });
  if (identity?.club?.logo) return identity.club;
  for (const candidate of candidateNames(name)) {
    const club = resolver.resolveClub?.(candidate);
    if (club?.logo) return club;
  }
  const targets = candidateNames(name).map(normalize);
  return clubs.find((club) => targets.includes(normalize(club.displayName || club.club || club.slug)))
    || clubs.find((club) => targets.some((target) => target && normalize(club.displayName || club.club || club.slug).includes(target)))
    || null;
}

function assetFor(name, group) {
  const ranked = rankedTeamFor(name, group);
  const joSlug = joProfiles.lookup?.[`${group?.id || ''}|${normalize(name)}`];
  const joProfile = joSlug ? joProfiles.teams?.[joSlug] : null;
  const club = clubFor(name, group);
  const usableLogo = (value) => Boolean(value) && !String(value).includes('cpi-logo-fallback');
  const rankedLogo = usableLogo(ranked?.logo) ? ranked.logo : '';
  const joProfileLogo = usableLogo(joProfile?.logo) ? joProfile.logo : '';
  const clubLogo = usableLogo(club?.logo) ? club.logo : '';
  return {
    logo: rankedLogo || joProfileLogo || clubLogo || 'assets/logos/cpi-logo-fallback.svg',
    profile: joProfile?.teamPage
      || ranked?.teamPage
      || club?.clubPage
      || (joProfile?.profileSlug ? `team.html?team=${encodeURIComponent(joProfile.profileSlug)}` : '')
      || (club?.slug ? `club.html?club=${encodeURIComponent(club.slug)}` : ''),
  };
}

let total = 0;
let verifiedArtwork = 0;
const assets = new Map();
for (const group of results.groups || []) {
  for (const division of group.divisions || []) {
    for (const subdivision of division.subdivisions || []) {
      for (const team of subdivision.teams || []) {
        total += 1;
        const asset = assetFor(team.team, group);
        assets.set(`${group.id}|${normalize(team.team)}`, asset);
        if (!asset.logo.includes('cpi-logo-fallback') && fs.existsSync(path.join(root, asset.logo))) {
          verifiedArtwork += 1;
        }
      }
    }
  }
}
if (total !== 976) fail(`Expected 976 JO placements, found ${total}.`);
if (verifiedArtwork < 955) fail(`Verified JO artwork coverage regressed below 955 placements: ${verifiedArtwork}.`);

const expected = [
  ['14u-boys', 'Ciu Gold', 'assets/logos/canonical/ciu.webp'],
  ['14u-boys', 'Santa Barbara Wpc A', 'assets/logos/canonical/santa-barbara.webp'],
  ['14u-boys', 'SD Dons 13a Gold', 'assets/logos/canonical/sd-dons.webp'],
  ['14u-boys', 'North Irvine Black', 'assets/logos/canonical/north-irvine.webp'],
  ['14u-boys', 'CC United Blue', 'assets/logos/canonical/cc-united.webp'],
  ['14u-boys', 'Patriot Navy', 'assets/logos/canonical/patriot.webp'],
  ['14u-boys', 'Newport Beach Blue', 'assets/logos/canonical/newport-beach.webp'],
  ['12u-boys', 'Arroyo Grande', 'assets/logos/canonical/arroyo-grande.webp'],
];
for (const [groupId, teamName, logo] of expected) {
  const asset = assets.get(`${groupId}|${normalize(teamName)}`);
  if (!asset) fail(`Missing JO placement asset for ${groupId} / ${teamName}.`);
  if (asset.logo !== logo) fail(`${groupId} / ${teamName} resolved to ${asset.logo}; expected ${logo}.`);
}

console.log('JO RESULTS LOGO REGRESSION 7.52.15 TESTS PASSED');
console.log(` - ${verifiedArtwork} of ${total} JO placements resolve to existing club artwork`);
console.log(' - JO team-profile routes no longer suppress verified club logos');
console.log(' - Known CIU, Santa Barbara, SD Dons, North Irvine, CC United, Patriot, Newport Beach, and Arroyo Grande variants are protected');
