#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'data/identity/runtime.js'),'utf8'),context,{filename:'data/identity/runtime.js'});
vm.runInContext(fs.readFileSync(path.join(root,'js/cpi-identity.js'),'utf8'),context,{filename:'js/cpi-identity.js'});

const resolver=context.window.CPIIdentity;
if(!resolver)throw new Error('CPIIdentity did not initialize.');
if(resolver.release!=='7.52.8')throw new Error(`Expected resolver 7.52.8, found ${resolver.release}.`);

const cases=[
  ['Ciu Gold','club-ciu'],
  ['Ciu Coast','club-ciu'],
  ['Ciu Seniors A','club-ciu'],
  ['SD Dons 13a Gold','club-sd-dons'],
  ['Santa Barbara Wpc A','club-santa-barbara'],
  ['Texas Thunder North Black','club-thunder'],
  ['Central Valley United','club-cvu'],
  ['Trojan Cardinal','club-trojan'],
  ['San Jose Foundation Black','club-sj-foundation'],
  ['Vegas North Irvine Black','club-north-irvine'],
  ['San Joe Express Blue','club-san-jose-express'],
  ['Brookyln Hustle','club-brooklyn-hustle'],
  ['Tsunami','club-rancho-tsunami'],
  ['Cal Republic Red','club-cal-rep'],
  ['680 Drivers','club-680'],
  ['LB Shore Red','club-long-beach-shore'],
  ['LB Viking Blue','club-viking'],
  ['Laguna Gold','club-laguna-beach'],
  ['Palos Verdes Black','club-pv-wpc'],
  ['ECA','club-sd-eca'],
  ['Tualatin Hills','club-t-hills'],
  ['Tri Valley','club-tri-valley-tritons']
];

for(const [source,expected] of cases){
  const club=resolver.resolveClub(source);
  if(!club)throw new Error(`No club resolved for ${source}.`);
  if(club.id!==expected)throw new Error(`${source} resolved to ${club.id}; expected ${expected}.`);
  if(!club.logo)throw new Error(`${source} resolved without a logo.`);
  const logoPath=path.join(root,club.logo);
  if(!fs.existsSync(logoPath))throw new Error(`${source} logo does not exist: ${club.logo}`);
}

const brentwood=resolver.resolveClub('Lamorinda Brentwood Gold');
if(brentwood?.id!=='club-lamorinda-brentwood')throw new Error('Lamorinda Brentwood must remain a distinct club identity.');
const topaz=resolver.resolveClub('Topaz Tsunami');
if(topaz?.id!=='club-topaz-tsunami')throw new Error('Topaz Tsunami must not be remapped to Rancho Tsunami.');

console.log(`JO logo identity test passed: ${cases.length} approved aliases plus separation safeguards.`);
