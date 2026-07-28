/* WPI canonical identity resolver — registry 7.40.0, JO logo delivery patch 7.52.10 */
(function(global){
  'use strict';

  const runtime=global.CPI_IDENTITY_RUNTIME||{
    clubs:{},
    teams:{},
    clubAliasIndex:{},
    teamScopedAliasIndex:{},
    teamUnscopedAliasIndex:{}
  };

  const JO_LOGO_ONLY_CLUBS=Object.freeze({
    'club-coronado':Object.freeze({id:'club-coronado',name:'Coronado',displayName:'Coronado Aquatics Club',logo:'assets/logos/canonical/coronado.webp',identityStatus:'logo_only'}),
    'club-ngen':Object.freeze({id:'club-ngen',name:'NGen',displayName:'Next Generation Aquatics',logo:'assets/logos/canonical/ngen.webp',identityStatus:'logo_only'}),
    'club-la-city-united':Object.freeze({id:'club-la-city-united',name:'LA City United',displayName:'LA City United',logo:'assets/logos/canonical/la-city-united.webp',identityStatus:'logo_only'}),
    'club-riverside':Object.freeze({id:'club-riverside',name:'Riverside',displayName:'Riverside',logo:'assets/logos/canonical/riverside.webp',identityStatus:'logo_only'}),
    'club-pac-orange':Object.freeze({id:'club-pac-orange',name:'PAC Orange',displayName:'PAC Orange',logo:'assets/logos/canonical/pac-orange.webp',identityStatus:'logo_only'})
  });

  const JO_EXACT_CLUB_ALIASES=Object.freeze({
    'central valley united':'club-cvu',
    'kern premier':'club-kern-premier',
    'chula vista premier':'club-cv-premier',
    'corona del mar':'club-cdm',
    'coronado':'club-coronado',
    'ngen':'club-ngen',
    'n gen':'club-ngen',
    'la city united':'club-la-city-united',
    'san francisco warriors':'club-san-francisco',
    'arroyo grande':'club-arroyo-grande',
    'innes arden':'club-innis-arden',
    'la verne legends':'club-lv-legends',
    'loyola':'club-loyola-wpc',
    'loyola venice':'club-loyola-wpc',
    'midvalley':'club-mid-valley',
    'riverside':'club-riverside',
    'team santa monica':'club-tsm',
    'third coast aquatics':'club-third-coast',
    'tpc sharks':'club-sharks',
    'yolo flamingos':'club-yolo',
    'honolulu':'club-honolulu-water-polo',
    'berkeley':'club-berkeley-wpc',
    'clovis':'club-clovis',
    'pac orange':'club-pac-orange',
    'texas thunder':'club-thunder',
    'cal republic':'club-cal-rep',
    'california republic':'club-cal-rep',
    'san jose foundation':'club-sj-foundation',
    'san jose wpf':'club-sj-foundation',
    'sj water polo foundation':'club-sj-foundation',
    'tualatin hills':'club-t-hills',
    'eca':'club-sd-eca',
    'tri valley':'club-tri-valley-tritons',
    'lb viking':'club-viking',
    'long beach viking':'club-viking',
    'palos verdes':'club-pv-wpc',
    'palos verdes wpc':'club-pv-wpc',
    'laguna':'club-laguna-beach',
    'tsunami':'club-rancho-tsunami'
  });

  const JO_PREFIX_CLUB_ALIASES=Object.freeze([
    [/^lamorinda brentwood(?: |$)/,'club-lamorinda-brentwood'],
    [/^vegas north irvine(?: |$)/,'club-north-irvine'],
    [/^chula vista premier(?: |$)/,'club-cv-premier'],
    [/^corona del mar(?: |$)/,'club-cdm'],
    [/^coronado(?: |$)/,'club-coronado'],
    [/^ngen(?: |$)/,'club-ngen'],
    [/^n gen(?: |$)/,'club-ngen'],
    [/^la city united(?: |$)/,'club-la-city-united'],
    [/^san francisco warriors(?: |$)/,'club-san-francisco'],
    [/^arroyo grande(?: |$)/,'club-arroyo-grande'],
    [/^innes arden(?: |$)/,'club-innis-arden'],
    [/^la verne legends(?: |$)/,'club-lv-legends'],
    [/^loyola(?: venice| wpc)?(?: |$)/,'club-loyola-wpc'],
    [/^midvalley(?: |$)/,'club-mid-valley'],
    [/^riverside(?: |$)/,'club-riverside'],
    [/^team santa monica(?: |$)/,'club-tsm'],
    [/^third coast aquatics(?: |$)/,'club-third-coast'],
    [/^tpc sharks(?: |$)/,'club-sharks'],
    [/^viper pigeon(?: |$)/,'club-viper-pigeon'],
    [/^yolo flamingos(?: |$)/,'club-yolo'],
    [/^honolulu(?: |$)/,'club-honolulu-water-polo'],
    [/^berkeley(?: |$)/,'club-berkeley-wpc'],
    [/^clovis(?: |$)/,'club-clovis'],
    [/^la jolla(?: united)?(?: |$)/,'club-la-jolla-united'],
    [/^pac orange(?: |$)/,'club-pac-orange'],
    [/^central valley united(?: |$)/,'club-cvu'],
    [/^kern premier(?: |$)/,'club-kern-premier'],
    [/^texas thunder(?: |$)/,'club-thunder'],
    [/^san jose foundation(?: |$)/,'club-sj-foundation'],
    [/^san jose wpf(?: |$)/,'club-sj-foundation'],
    [/^san jose express(?: |$)/,'club-san-jose-express'],
    [/^brooklyn hustle(?: |$)/,'club-brooklyn-hustle'],
    [/^santa barbara(?: wpc)?(?: |$)/,'club-santa-barbara'],
    [/^north irvine(?: wpc)?(?: |$)/,'club-north-irvine'],
    [/^sd dons(?: |$)/,'club-sd-dons'],
    [/^san diego dons(?: |$)/,'club-sd-dons'],
    [/^ciu(?: |$)/,'club-ciu'],
    [/^channel islands united(?: |$)/,'club-ciu'],
    [/^trojan(?: |$)/,'club-trojan'],
    [/^rancho tsunami(?: |$)/,'club-rancho-tsunami'],
    [/^680(?: |$)/,'club-680'],
    [/^908(?: |$)/,'club-908'],
    [/^(?:lb shore|long beach shore)(?: |$)/,'club-long-beach-shore'],
    [/^(?:lb viking|long beach viking)(?: |$)/,'club-viking'],
    [/^(?:cal republic|california republic|cal rep)(?: |$)/,'club-cal-rep'],
    [/^(?:palos verdes|pv wpc)(?: |$)/,'club-pv-wpc'],
    [/^(?:laguna beach|laguna)(?: |$)/,'club-laguna-beach'],
    [/^(?:tualatin hills|t hills)(?: |$)/,'club-t-hills'],
    [/^(?:tri valley tritons|tri valley)(?: |$)/,'club-tri-valley-tritons']
  ]);

  const JO_TEAM_SUFFIXES=new Set([
    'a','b','c','d','13a',
    'black','blue','red','white','gold','silver','orange','green','teal','yellow','navy','gray','grey',
    'premier','cardinal','coast','seniors','senior','north','south'
  ]);

  function normalize(value){
    let text=String(value||'')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g,'')
      .toLowerCase()
      .replace(/&/g,' and ');
    text=text.replace(/^\s*#?\d+\s*[-–—:]\s+(?=[a-z])/i,'');
    text=text.replace(/\bwater\s+polo\s+club\b/g,'wpc');
    return text.replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  }

  function scopedKey(context,raw){
    const season=String(context?.season||'2026');
    const age=String(context?.ageGroup||context?.age||'').toLowerCase();
    const gender=String(context?.gender||'').toLowerCase();
    return [season,age,gender,normalize(raw)].join('|');
  }

  function clubMatch(id,matchType){
    const club=id&&(runtime.clubs?.[id]||JO_LOGO_ONLY_CLUBS[id]);
    return club?{...club,matchType}:null;
  }

  function addVariant(values,value){
    const normalized=normalize(value);
    if(normalized&&!values.includes(normalized))values.push(normalized);
  }

  function clubVariants(raw){
    const values=[];
    addVariant(values,raw);

    const initial=values[0]||'';
    addVariant(values,initial.replace(/\bbrookyln\b/g,'brooklyn'));
    addVariant(values,initial.replace(/\bsan joe\b/g,'san jose'));
    addVariant(values,initial.replace(/\bcentral valley united water polo\b/g,'central valley united'));

    for(let cursor=0;cursor<values.length;cursor+=1){
      let candidate=values[cursor];
      candidate=candidate
        .replace(/\s+(?:10u|12u|14u|16u|18u)(?:\s+(?:boys|girls|coed))?$/,'')
        .trim();
      addVariant(values,candidate);

      let stripped=candidate;
      for(let index=0;index<5;index+=1){
        const tokens=stripped.split(' ');
        const last=tokens[tokens.length-1];
        if(!JO_TEAM_SUFFIXES.has(last))break;
        tokens.pop();
        stripped=tokens.join(' ').trim();
        addVariant(values,stripped);
      }
    }
    return values;
  }

  function curatedClubId(normalized){
    const exact=JO_EXACT_CLUB_ALIASES[normalized];
    if(exact)return exact;
    for(const [pattern,id] of JO_PREFIX_CLUB_ALIASES){
      if(pattern.test(normalized))return id;
    }
    return null;
  }

  function resolveClub(raw){
    const variants=clubVariants(raw);

    for(const candidate of variants){
      const id=runtime.clubAliasIndex?.[candidate];
      const match=clubMatch(id,candidate===variants[0]?'club_alias':'normalized_club_alias');
      if(match)return match;
    }

    for(const candidate of variants){
      const match=clubMatch(curatedClubId(candidate),'jo_logo_alias');
      if(match)return match;
    }
    return null;
  }

  function resolveTeam(raw,context={}){
    const normalized=normalize(raw);
    if(!normalized)return null;
    const scopedId=runtime.teamScopedAliasIndex?.[scopedKey(context,raw)];
    let id=scopedId||null;
    let matchType=scopedId?'scoped_alias':'';
    if(!id){
      const candidateId=runtime.teamUnscopedAliasIndex?.[normalized];
      const candidate=candidateId&&runtime.teams?.[candidateId];
      const season=String(context?.season||'2026');
      const age=String(context?.ageGroup||context?.age||'').toLowerCase();
      const gender=String(context?.gender||'').toLowerCase();
      const scopeMatches=candidate
        && (!season||String(candidate.season||'')===season)
        && (!age||String(candidate.ageGroup||'').toLowerCase()===age)
        && (!gender||String(candidate.gender||'').toLowerCase()===gender);
      if(scopeMatches){id=candidateId;matchType='unique_unscoped_alias';}
    }
    const team=id&&runtime.teams?.[id];
    if(!team)return null;
    return {...team,club:runtime.clubs?.[team.clubId]||null,matchType};
  }

  function cleanSourceName(raw){
    return String(raw||'').replace(/^\s*#?\d+\s*[-–—:]\s+(?=[a-z])/i,'').trim();
  }

  function canonicalName(raw,context={}){
    return resolveTeam(raw,context)?.name||cleanSourceName(raw);
  }

  function attributes(raw,context={}){
    const identity=resolveTeam(raw,context);
    if(!identity)return{};
    return{canonicalTeamId:identity.id,canonicalClubId:identity.clubId};
  }

  global.CPIIdentity=Object.freeze({
    release:'7.52.10',
    schemaVersion:runtime.schemaVersion||1,
    normalize,
    resolveClub,
    resolveTeam,
    canonicalName,
    cleanSourceName,
    attributes,
    counts:{clubs:Object.keys(runtime.clubs||{}).length,teams:Object.keys(runtime.teams||{}).length}
  });
})(window);
