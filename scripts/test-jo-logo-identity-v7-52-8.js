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
if(!['7.52.8','7.52.9','7.52.10','7.52.12','7.52.13'].includes(resolver.release))throw new Error(`Expected resolver 7.52.8 or later 7.52.x logo release, found ${resolver.release}.`);

const cases=[
  ['Ciu Gold','club-ciu'],
  ['Ciu Coast','club-ciu'],
  ['Ciu Seniors A','club-ciu'],
  ['SD Dons 13a Gold','club-sd-dons'],
  ['Santa Barbara Wpc A','club-santa-barbara'],
  ['Texas Thunder North Black','club-thunder'],
  ['Central Valley United','club-cvu'],
  ['Kern Premier','club-kern-premier'],
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
  ['Tri Valley','club-tri-valley-tritons'],
  ['Chula Vista Premier','club-cv-premier'],
  ['Corona Del Mar','club-cdm'],
  ['Coronado','club-coronado'],
  ['Ngen','club-ngen'],
  ['LA City United','club-la-city-united'],
  ['San Francisco Warriors','club-san-francisco'],
  ['Arroyo Grande','club-arroyo-grande'],
  ['Innes Arden','club-innis-arden'],
  ['LA Verne Legends','club-lv-legends'],
  ['Loyola Venice','club-loyola-wpc'],
  ['Midvalley Blue','club-mid-valley'],
  ['Riverside','club-riverside'],
  ['Team Santa Monica','club-tsm'],
  ['Third Coast Aquatics','club-third-coast'],
  ['TPC Sharks','club-sharks'],
  ['Viper Pigeon Hill Country','club-viper-pigeon'],
  ['Viper Pigeon Htown','club-viper-pigeon'],
  ['Yolo Flamingos','club-yolo'],
  ['Honolulu A','club-honolulu-water-polo'],
  ['Berkeley','club-berkeley-wpc'],
  ['Clovis','club-clovis'],
  ['La Jolla C','club-la-jolla-united'],
  ['PAC Orange','club-pac-orange']
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
