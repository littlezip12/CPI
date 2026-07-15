/* CPI canonical identity resolver — data 7.40.0, scope-safety patch 7.41.0 */
(function(global){
  'use strict';
  const runtime=global.CPI_IDENTITY_RUNTIME||{clubs:{},teams:{},clubAliasIndex:{},teamScopedAliasIndex:{},teamUnscopedAliasIndex:{}};

  function normalize(value){
    let text=String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ');
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
  function resolveClub(raw){
    const id=runtime.clubAliasIndex?.[normalize(raw)];
    return id&&runtime.clubs?.[id]?{...runtime.clubs[id],matchType:'club_alias'}:null;
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
    release:'7.40.0',
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
