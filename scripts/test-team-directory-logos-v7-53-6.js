#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const fail = message => { console.error(`TEAM DIRECTORY LOGO 7.53.6 TEST FAILED\n - ${message}`); process.exit(1); };

const site = JSON.parse(read('config/site-release.json'));
if (!['7.53.7','7.54.0','7.54.1','7.54.2','7.54.3','7.54.4','7.54.5','7.54.6','7.54.7','7.54.8','7.54.9','7.54.10','7.54.11','7.54.12','7.54.13','7.54.14','7.54.15','7.54.17','7.54.18','7.55.0','7.55.1','7.55.2','7.55.4','7.55.5','7.55.6','7.55.7','7.55.8','7.55.9','7.56.0','7.56.1','7.56.2','7.56.3','7.56.4','7.56.7','7.56.8','7.56.9','7.56.11','7.56.12','7.56.13','7.56.14','7.56.15','7.57.0','7.57.1','7.57.2','7.57.3','7.57.4','7.57.5','7.57.6','7.57.7','7.57.8','7.57.9','7.57.10','7.57.11','7.57.12','7.57.13','7.57.14','7.57.15','7.57.16','7.57.17','7.57.18','7.57.19','7.57.20','7.57.21','7.57.22','7.58.0','7.58.1','7.58.2'].includes(site.version)) fail('site version must preserve the 7.53.6 logo release');
if (!['7.53.6','7.54.14','7.54.15','7.54.17','7.54.18'].includes(site.teamDirectoryRelease)) fail('teamDirectoryRelease must preserve the 7.53.6 logo-enabled directory');
if (site.teamDirectoryLogoRelease !== '7.53.6') fail('teamDirectoryLogoRelease must be 7.53.6');

const html = read('teams.html');
const required = [
  'data/identity/runtime.js?v=7.53.6',
  'js/cpi-identity.js?v=7.53.6',
  'data/tournaments/jo-profile-runtime.js?v=7.53.4',
  'js/teams-directory-v7-53-4.js?v=7.54.14'
];
for (const token of required) if (!html.includes(token)) fail(`teams.html missing ${token}`);
const positions = required.map(token => html.indexOf(token));
if (!(positions[0] < positions[1] && positions[1] < positions[2] && positions[2] < positions[3])) {
  fail('identity runtime and resolver must load before the JO profile and directory runtimes');
}

const runtime = read('js/teams-directory-v7-53-4.js');
for (const token of ['resolveClubIdentity', 'resolver.resolveClub', 'clubBySlug.get(identityClub?.slug)', 'team.logo || club?.logo || fallbackLogo']) {
  if (!runtime.includes(token)) fail(`directory runtime missing ${token}`);
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(read('data/identity/runtime.js'), sandbox);
vm.runInContext(read('js/cpi-identity.js'), sandbox);
vm.runInContext(read('data/tournaments/jo-profile-runtime.js'), sandbox);

const profiles = Object.values(sandbox.window.WPI_JO_PROFILES?.teams || {});
let direct = 0;
let resolved = 0;
let unresolved = 0;
for (const team of profiles) {
  if (team.logo) { direct += 1; continue; }
  const name = team.displayTeamName || team.team || team.clubName || '';
  const club = sandbox.window.CPIIdentity.resolveClub(team.clubName || '')
    || sandbox.window.CPIIdentity.resolveClub(name);
  if (club?.logo && fs.existsSync(path.join(ROOT, club.logo))) resolved += 1;
  else unresolved += 1;
}
if (direct + resolved < 900) fail(`expected at least 900 JO profiles to resolve verified artwork; found ${direct + resolved}`);

const expected = {
  '680 Blue': 'assets/logos/canonical/680.webp',
  '680 Red': 'assets/logos/canonical/680.webp',
  '680 White': 'assets/logos/canonical/680.webp',
  '908 Yellow': 'assets/logos/canonical/908.webp',
  'CDM White': 'assets/logos/canonical/cdm.webp',
  'Greenwich Blue': 'assets/logos/canonical/greenwich.webp'
};
for (const [name, logo] of Object.entries(expected)) {
  const club = sandbox.window.CPIIdentity.resolveClub(name);
  if (club?.logo !== logo) fail(`${name} should resolve to ${logo}, found ${club?.logo || 'none'}`);
}

console.log('TEAM DIRECTORY LOGO 7.53.6 TEST PASSED');
console.log(` - ${direct} JO profiles carry direct artwork`);
console.log(` - ${resolved} additional JO profiles resolve through canonical club identity`);
console.log(` - ${unresolved} profiles remain generic because no verified club artwork is available`);
console.log(' - 680, 908, CDM, and Greenwich color variants reuse their approved club logos');
