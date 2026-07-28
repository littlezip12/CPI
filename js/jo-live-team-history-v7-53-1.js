(function () {
  "use strict";

  const RELEASE = "7.53.1";
  const RELAY_BASE = "https://raw.githubusercontent.com/littlezip12/CPI/cpi-live-relay/data/tournaments/live-relay";
  const CONFIGS = [{"id":"10u-championship","age":"10U","division":"Championship (D1)","gid":"1659399499","gidAliases":["1659399499"],"sheetName":"10U_M_Champ_35","sheetNameAliases":["10U_M_Champ_35"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/10u-championship.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"12u-boys-championship","age":"12U","division":"Boys Championship (D1)","gid":"1775879786","gidAliases":["1775879786"],"sheetName":"12U_M_Champ","sheetNameAliases":["12U_M_Champ"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/12u-boys-championship.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"12u-boys-classic","age":"12U","division":"Boys Classic (D2)","gid":"1808416221","gidAliases":["1808416221"],"sheetName":"12U_M_Classic_53","sheetNameAliases":["12U_M_Classic_53"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/12u-boys-classic.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"14u-boys-championship","age":"14U","division":"Boys Championship (D1)","gid":"345265555","gidAliases":["345265555"],"sheetName":"14U_M_Champ","sheetNameAliases":["14U_M_Champ"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/14u-boys-championship.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"14u-boys-classic","age":"14U","division":"Boys Classic (D2)","gid":"732732301","gidAliases":["732732301","1855118263"],"sheetName":"14U_M_Classic","sheetNameAliases":["14U_M_Classic"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/14u-boys-classic.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"14u-boys-invitational","age":"14U","division":"Boys Invitational (D3)","gid":"1975322406","gidAliases":["1975322406"],"sheetName":"14U_M_Invite_36","sheetNameAliases":["14U_M_Invite_36"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/14u-boys-invitational.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"16u-boys-championship","age":"16U","division":"Boys Championship (D1)","gid":"2012475287","gidAliases":["2012475287"],"sheetName":"16U_M_Champ","sheetNameAliases":["16U_M_Champ"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/16u-boys-championship.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"16u-boys-classic","age":"16U","division":"Boys Classic (D2)","gid":"1142418841","gidAliases":["1142418841"],"sheetName":"16U_M_Classic","sheetNameAliases":["16U_M_Classic"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/16u-boys-classic.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"16u-boys-invitational","age":"16U","division":"Boys Invitational (D3)","gid":"1686454973","gidAliases":["1686454973"],"sheetName":"16U_M_Invite","sheetNameAliases":["16U_M_Invite"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/16u-boys-invitational.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"18u-boys-championship","age":"18U","division":"Boys Championship (D1)","gid":"38488572","gidAliases":["38488572"],"sheetName":"18U_M_Champ","sheetNameAliases":["18U_M_Champ"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/18u-boys-championship.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"18u-boys-classic","age":"18U","division":"Boys Classic (D2)","gid":"333261986","gidAliases":["333261986"],"sheetName":"18U_M_Classic","sheetNameAliases":["18U_M_Classic"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/18u-boys-classic.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"18u-boys-invitational","age":"18U","division":"Boys Invitational (D3)","gid":"289749610","gidAliases":["289749610"],"sheetName":"18U_M_Invite 24","sheetNameAliases":["18U_M_Invite 24"],"snapshotPath":"data/tournaments/raw/2026-jo-weekend-2/18u-boys-invitational.csv","gender":"boys","eventId":"2026-jo-weekend-2","sheetId":"1ycEOkayVwo_h37vL98PTXbzEnBpRU_-3S9l6NeiwCc4"},{"id":"10u-girls-championship","age":"10U","division":"Girls Championship (D1)","gid":"1690842489","gidAliases":["1690842489"],"sheetName":"10U_F_Champ-18 teams","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/10u-girls-championship.csv"},{"id":"10u-coed-championship","age":"10U","division":"Coed Championship (D1)","gid":"995024268","gidAliases":["995024268","2041957360"],"sheetName":"10U_Coed_Champ_36","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/10u-coed-championship.csv"},{"id":"10u-girls-classic","age":"10U","division":"Girls Classic (D2)","gid":"1824277279","gidAliases":["1824277279","597397535"],"sheetName":"10U_Coed_Classic 22 from 23","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/10u-girls-classic.csv"},{"id":"12u-coed-championship","age":"12U","division":"Coed Championship (D1)","gid":"1233368070","gidAliases":["1233368070","2012252190"],"sheetName":"12U_Coed_Champ-45","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/12u-coed-championship.csv"},{"id":"12u-girls-championship","age":"12U","division":"Girls Championship (D1)","gid":"1025107975","gidAliases":["1025107975","1128927098"],"sheetName":"12U_F_Champ-52","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/12u-girls-championship.csv"},{"id":"14u-girls-championship","age":"14U","division":"Girls Championship (D1)","gid":"490739644","gidAliases":["490739644","1268677491"],"sheetName":"14U_F_Champ","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/14u-girls-championship.csv"},{"id":"14u-girls-classic","age":"14U","division":"Girls Classic (D2)","gid":"1034305520","gidAliases":["1034305520","252316141"],"sheetName":"14U_F_Classic-39 from 40","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/14u-girls-classic.csv"},{"id":"16u-girls-championship","age":"16U","division":"Girls Championship (D1)","gid":"1614332560","gidAliases":["1614332560","61950596"],"sheetName":"16U_F_Champ","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/16u-girls-championship.csv"},{"id":"16u-girls-classic","age":"16U","division":"Girls Classic (D2)","gid":"1031667515","gidAliases":["1031667515","901188675"],"sheetName":"16U_F_Classic-45","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/16u-girls-classic.csv"},{"id":"18u-girls-championship","age":"18U","division":"Girls Championship (D1)","gid":"69636405","gidAliases":["69636405","934738630"],"sheetName":"18U_F_Champ","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/18u-girls-championship.csv"},{"id":"18u-girls-classic","age":"18U","division":"Girls Classic (D2)","gid":"1267400335","gidAliases":["1267400335","265773689"],"sheetName":"18U_F_Classic-44","gender":"girls","eventId":"2026-jo-weekend-1","sheetId":"1TyGB8m-dH1Q56v8Lpwdvw-S7kjxgP8MWsirsAeCYVNw","snapshotPath":"data/tournaments/raw/2026-jo-weekend-1/18u-girls-classic.csv"}];
  const ACRONYMS = new Set(["SD", "CDM", "LB", "CC", "WPC", "CHAWP", "LOWPO", "SHAQ", "OCWPC", "ECA", "ASA", "CMAC", "TPC", "WCAC", "SET", "LA", "OC", "USA", "CIU", "SKIP"]);

  function unique(values) {
    return [...new Set((values || []).filter(Boolean).map(String))];
  }

  function normalizeHeader(value) {
    return String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      const next = input[index + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        cell = "";
      } else cell += char;
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }

  function scoreParts(value) {
    const raw = String(value ?? "").trim();
    const match = raw.match(/^(\d+)(?:\.(\d+))?$/);
    return match ? { raw, regulation: Number(match[1]), shootout: match[2] == null ? null : Number(match[2]) } : null;
  }

  function isScoreCell(value) {
    return scoreParts(value) !== null;
  }

  function gameScoreParts(game) {
    return { white: scoreParts(game?.whiteScore), dark: scoreParts(game?.darkScore) };
  }

  function scoreOutcome(game) {
    const parts = gameScoreParts(game);
    if (!parts.white || !parts.dark) return null;
    if (parts.white.regulation !== parts.dark.regulation) return parts.white.regulation > parts.dark.regulation ? "white" : "dark";
    if (parts.white.shootout != null && parts.dark.shootout != null && parts.white.shootout !== parts.dark.shootout) {
      return parts.white.shootout > parts.dark.shootout ? "white" : "dark";
    }
    return null;
  }

  function scoreDisplay(game) {
    const parts = gameScoreParts(game);
    if (!parts.white || !parts.dark) return "";
    if (parts.white.shootout != null || parts.dark.shootout != null) {
      return `${parts.white.regulation}–${parts.dark.regulation} (SO ${parts.white.shootout ?? 0}–${parts.dark.shootout ?? 0})`;
    }
    return `${parts.white.regulation}–${parts.dark.regulation}`;
  }

  function headerIndex(row, names) {
    const normalized = row.map(normalizeHeader);
    for (const name of names) {
      const index = normalized.indexOf(name);
      if (index >= 0) return index;
    }
    return -1;
  }

  function headerMap(row) {
    const date = headerIndex(row, ["date"]);
    const time = headerIndex(row, ["time"]);
    const type = headerIndex(row, ["type", "stage"]);
    const location = headerIndex(row, ["location", "venue"]);
    const game = headerIndex(row, ["gm #", "gm#", "game #", "game", "gm"]);
    const white = headerIndex(row, ["white", "team 1"]);
    const dark = headerIndex(row, ["dark", "team 2"]);
    const winnerTo = headerIndex(row, ["w to #", "w to", "winner to", "win to"]);
    const loserTo = headerIndex(row, ["l to #", "l to", "loser to", "loss to"]);
    const gmid = headerIndex(row, ["gmid", "gm id", "game id"]);
    if ([date, time, game, white, dark, gmid].some((index) => index < 0)) return null;
    const normalized = row.map(normalizeHeader);
    const whiteScore = normalized.findIndex((value, index) => index > white && index < dark && (value === "s" || value === "score"));
    const darkScore = normalized.findIndex((value, index) => index > dark && (winnerTo < 0 || index < winnerTo) && (value === "s" || value === "score"));
    return { date, time, type, stageDetail: gmid >= 0 ? gmid + 2 : -1, location, game, white, whiteScore, dark, darkScore, winnerTo, loserTo, gmid };
  }

  function normalizeGameNumber(value) {
    const raw = String(value || "").trim().toUpperCase();
    return /^\d+$/.test(raw) ? Number(raw) : raw;
  }

  function validGameNumber(value) {
    return /^\d+[A-Z]?$/.test(String(value || "").trim());
  }

  function validGameId(value) {
    return /^\d{2}[A-Z]+-\d+[A-Z]?$/i.test(String(value || "").trim());
  }

  function gameNumberFromId(value) {
    const match = String(value || "").trim().toUpperCase().match(/^\d{2}[A-Z]+-(\d+[A-Z]?)$/);
    return match ? match[1] : "";
  }

  function normalizeDestination(value) {
    let normalized = String(value || "").trim();
    let match = normalized.match(/^[WL]-?(\d+[A-Z]?)$/i);
    if (match) return match[1].toUpperCase();
    match = normalized.match(/^[WL]-?([a-z]{2,3}_[A-Z]\d)$/i);
    if (match) return match[1];
    return normalized.replace(/-$/, "");
  }

  function mappedGame(row, map) {
    const get = (index) => index >= 0 ? String(row[index] || "").trim() : "";
    const gmid = get(map.gmid);
    const date = get(map.date);
    const time = get(map.time);
    const gameRaw = get(map.game) || gameNumberFromId(gmid);
    if (!validGameNumber(gameRaw) || !validGameId(gmid) || !date || !time) return null;
    return {
      date,
      time,
      type: get(map.type),
      stageDetail: get(map.stageDetail),
      location: get(map.location),
      game: normalizeGameNumber(gameRaw),
      whiteRaw: get(map.white),
      whiteScore: get(map.whiteScore),
      darkRaw: get(map.dark),
      darkScore: get(map.darkScore),
      winnerTo: normalizeDestination(get(map.winnerTo)),
      loserTo: normalizeDestination(get(map.loserTo)),
      gmid
    };
  }

  function inferredGame(row) {
    const cells = row.map((value) => String(value ?? "").trim());
    let gmidIndex = -1;
    for (let index = cells.length - 1; index >= 0; index -= 1) {
      if (validGameId(cells[index])) {
        gmidIndex = index;
        break;
      }
    }
    if (gmidIndex < 0) return null;
    const gmid = cells[gmidIndex];
    const derivedGame = gameNumberFromId(gmid);
    if (!derivedGame) return null;
    const dateIndex = cells.findIndex((value, index) => index < gmidIndex && (/^\d{1,2}-[A-Za-z]{3}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)));
    if (dateIndex < 0) return null;
    const timeIndex = cells.findIndex((value, index) => index > dateIndex && index < gmidIndex && /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(value));
    if (timeIndex < 0) return null;
    const structuralGameIndex = gmidIndex - 7;
    let gameIndex = structuralGameIndex > timeIndex ? structuralGameIndex : -1;
    if (gameIndex < 0 || (!validGameNumber(cells[gameIndex]) && cells[gameIndex])) {
      gameIndex = cells.findIndex((value, index) => index > timeIndex && index < gmidIndex && validGameNumber(value));
    }
    if (gameIndex < 0) return null;
    const destinationStart = gmidIndex - 2;
    if (destinationStart <= gameIndex + 1) return null;
    const participantIndices = [];
    for (let index = gameIndex + 1; index < destinationStart; index += 1) {
      if (cells[index] && !isScoreCell(cells[index])) participantIndices.push(index);
    }
    if (participantIndices.length < 2) return null;
    const white = participantIndices[0];
    const dark = participantIndices[1];
    return {
      date: cells[dateIndex],
      time: cells[timeIndex],
      type: cells[timeIndex + 1] || "",
      stageDetail: cells[gmidIndex + 2] || "",
      location: cells[gameIndex - 1] || "",
      game: normalizeGameNumber(validGameNumber(cells[gameIndex]) ? cells[gameIndex] : derivedGame),
      whiteRaw: cells[white],
      whiteScore: cells.slice(white + 1, dark).find(isScoreCell) || "",
      darkRaw: cells[dark],
      darkScore: cells.slice(dark + 1, destinationStart).find(isScoreCell) || "",
      winnerTo: normalizeDestination(cells[gmidIndex - 2]),
      loserTo: normalizeDestination(cells[gmidIndex - 1]),
      gmid
    };
  }

  function parseRows(rows) {
    const games = [];
    let map = null;
    for (const row of rows || []) {
      const candidate = headerMap(row);
      if (candidate) {
        map = candidate;
        continue;
      }
      const game = (map && mappedGame(row, map)) || inferredGame(row);
      if (game) games.push(game);
    }
    const deduped = new Map();
    for (const game of games) deduped.set(`${game.gmid}|${game.game}`, game);
    return [...deduped.values()];
  }

  function titleTeam(name) {
    return String(name || "").trim().replace(/\(Seed-Team Name\)$/i, "").trim().split(/\s+/).map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
  }

  function seedInfo(raw) {
    const value = String(raw || "").trim();
    const dash = value.indexOf("-");
    if (dash < 1) return null;
    const prefix = value.slice(0, dash).replace(/\s+/g, "");
    const name = value.slice(dash + 1).trim();
    if (/^[WL]#?\d+[A-Z]?$/i.test(prefix)) return null;
    if (!name || !(/^[A-Z]\d?\(\d+\)$/i.test(prefix) || /^[A-Z]\(\d+\)$/i.test(prefix) || /^[A-Z]\d+$/i.test(prefix) || /^\d+$/.test(prefix))) return null;
    const group = /^[A-Z]/i.test(prefix) ? prefix[0].toUpperCase() : null;
    const seedMatch = prefix.match(/\((\d+)\)$/) || prefix.match(/^[A-Z](\d+)$/i) || prefix.match(/^(\d+)$/);
    return { team: titleTeam(name), group, seed: seedMatch ? Number(seedMatch[1]) : 999 };
  }

  function smartTeam(raw) {
    return seedInfo(raw)?.team || null;
  }

  function identityKey(value) {
    return titleTeam(value).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function structuredParticipantPrefix(raw) {
    return /^(?:\d+|[A-Z]\d+(?:\(\d+\))?|[A-Z]\(\d+\)|[WL]#?\d+[A-Z]?|[WL]#?[A-Z]{1,2}\d+\/[A-Z]{1,2}\d+|[A-Za-z]{2,3}[_\s(]?[A-Z]{1,2}\d+(?:\([^)]*\))*|(?:1st|2nd|3rd|4th|5th)\s*(?:[A-Za-z]{2,3}[_\s-]?)?[A-Z]{1,2}(?:\([^)]*\))*)$/i.test(String(raw || "").trim().replace(/\s+/g, " "));
  }

  function routeAssignmentCandidate(raw) {
    const value = String(raw || "").trim();
    const patterns = [
      /^([WL]#?(?:\d+[A-Z]?|[A-Z]{1,2}\d+\/[A-Z]{1,2}\d+))\s*[-–—:]\s*(.+)$/i,
      /^([A-Za-z]{2,3}[_\s(]?[A-Z]{1,2}\d+(?:\([^)]*\))*)\s*[-–—:]\s*(.+)$/i,
      /^((?:1st|2nd|3rd|4th|5th)\s*(?:[A-Za-z]{2,3}[_\s-]?)?[A-Z]{1,2}(?:\([^)]*\))*)\s*[-–—:]\s*(.+)$/i,
      /^([A-Z]\d+(?:\(\d+\))?|\d+)\s*[-–—:]\s*(.+)$/i
    ];
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match?.[2]?.trim()) return titleTeam(match[2]);
    }
    return null;
  }

  function assignedRouteTeam(raw, knownTeams) {
    const value = String(raw || "").trim();
    const teams = [...(knownTeams || [])].filter(Boolean).sort((a, b) => String(b).length - String(a).length);
    for (const separator of ["-", "–", "—", ":"]) {
      let index = value.indexOf(separator);
      while (index >= 0) {
        const prefix = value.slice(0, index).trim();
        const suffix = value.slice(index + separator.length).trim();
        const key = identityKey(suffix);
        if (prefix && key && structuredParticipantPrefix(prefix)) {
          const found = teams.find((name) => identityKey(name) === key);
          if (found) return found;
        }
        index = value.indexOf(separator, index + separator.length);
      }
    }
    const candidate = routeAssignmentCandidate(value);
    if (!candidate) return null;
    const key = identityKey(candidate);
    return teams.find((name) => identityKey(name) === key) || null;
  }

  function parseWL(raw) {
    const match = String(raw || "").trim().match(/^([WL])#?(\d+[A-Z]?)(?:\s*[-–—:]\s*.*)?$/i);
    return match ? { kind: match[1].toUpperCase(), game: normalizeGameNumber(match[2]) } : null;
  }

  function normalizeRouteToken(raw) {
    return String(raw || "").trim().replace(/\s+/g, "").replace(/^([A-Za-z]{2,3})\(/, "$1_").replace(/[-–—:]+$/, "");
  }

  function parsePoolSlot(raw) {
    const match = normalizeRouteToken(raw).match(/^([A-Za-z]{2,3})_?([A-Z]{1,2})(\d+)(?:\([^)]*\))*(?:[-–—:].*)?$/i);
    return match ? { track: match[1].toLowerCase(), pool: match[2].toUpperCase(), seed: Number(match[3]), key: `${match[1].toLowerCase()}_${match[2].toUpperCase()}${match[3]}` } : null;
  }

  function parsePoolPlacement(raw) {
    const match = String(raw || "").trim().replace(/_/g, " ").match(/^(1st|2nd|3rd|4th|5th)\s*([A-Za-z]{2,3})\s*([A-Z]{1,2})(?:\s*\([^)]*\))*(?:\s*[-–—:]\s*.*)?$/i);
    return match ? { rank: Number(match[1][0]), track: match[2].toLowerCase(), pool: match[3].toUpperCase(), key: `${match[2].toLowerCase()}_${match[3].toUpperCase()}` } : null;
  }

  function parseGroupPlacement(raw) {
    const match = String(raw || "").trim().replace(/_/g, " ").match(/^(1st|2nd|3rd|4th|5th)\s*([A-Z]{1,2})(?:\s*\([^)]*\))*(?:\s*[-–—:]\s*.*)?$/i);
    return match ? { rank: Number(match[1][0]), group: match[2].toUpperCase(), key: match[2].toUpperCase() } : null;
  }

  function parsePoolMatchup(raw) {
    const match = normalizeRouteToken(raw).match(/^([WL])#?([A-Z]{1,2}\d+)\/([A-Z]{1,2}\d+)(?:[-–—:].*)?$/i);
    return match ? { kind: match[1].toUpperCase(), refs: [match[2].toUpperCase(), match[3].toUpperCase()].sort() } : null;
  }

  function poolSlotRef(raw) {
    const slot = parsePoolSlot(raw);
    return slot ? `${slot.pool}${slot.seed}` : null;
  }

  function poolMatchupMatchesGame(game, matchup) {
    const refs = [poolSlotRef(game?.whiteRaw), poolSlotRef(game?.darkRaw)].filter(Boolean).sort();
    return refs.length === 2 && refs[0] === matchup?.refs?.[0] && refs[1] === matchup?.refs?.[1];
  }

  function gameSort(a, b) {
    const date = String(a?.date || "").localeCompare(String(b?.date || ""));
    if (date) return date;
    return String(a?.time || "").localeCompare(String(b?.time || "")) || String(a?.game || "").localeCompare(String(b?.game || ""));
  }

  function routeTrackForGame(game) {
    const match = String(game?.stageDetail || game?.type || "").trim().match(/^([a-z]{2,3})[_-]/i);
    return match ? match[1].toLowerCase() : null;
  }

  function sourceGamesForPoolMatchup(games, matchup, targetGame = null) {
    const matches = (games || []).filter((game) => poolMatchupMatchesGame(game, matchup));
    const track = routeTrackForGame(targetGame);
    return track ? [...matches].sort((a, b) => {
      const aTrack = parsePoolSlot(a.whiteRaw)?.track === track ? 0 : 1;
      const bTrack = parsePoolSlot(b.whiteRaw)?.track === track ? 0 : 1;
      return aTrack - bTrack || gameSort(a, b);
    }) : matches.sort(gameSort);
  }

  function teamsFromGames(games) {
    return unique((games || []).flatMap((game) => [smartTeam(game.whiteRaw), smartTeam(game.darkRaw), routeAssignmentCandidate(game.whiteRaw), routeAssignmentCandidate(game.darkRaw)])).sort((a, b) => a.localeCompare(b));
  }

  function isFinal(game) {
    return scoreOutcome(game) !== null;
  }

  function outcome(game) {
    const side = scoreOutcome(game);
    if (!side || !game?.whiteTeam || !game?.darkTeam) return null;
    return side === "white" ? { winner: game.whiteTeam, loser: game.darkTeam } : { winner: game.darkTeam, loser: game.whiteTeam };
  }

  function rankTable(teamNames, games, seedLookup) {
    const table = new Map((teamNames || []).map((team) => [team, { team, wins: 0, gd: 0, gf: 0, seed: seedLookup.get(team) ?? 999 }]));
    for (const game of games || []) {
      if (!isFinal(game) || !game.whiteTeam || !game.darkTeam) continue;
      for (const team of [game.whiteTeam, game.darkTeam]) if (!table.has(team)) table.set(team, { team, wins: 0, gd: 0, gf: 0, seed: seedLookup.get(team) ?? 999 });
      const parts = gameScoreParts(game);
      const white = table.get(game.whiteTeam);
      const dark = table.get(game.darkTeam);
      white.gf += parts.white.regulation;
      white.gd += parts.white.regulation - parts.dark.regulation;
      dark.gf += parts.dark.regulation;
      dark.gd += parts.dark.regulation - parts.white.regulation;
      (scoreOutcome(game) === "white" ? white : dark).wins += 1;
    }
    return [...table.values()].sort((a, b) => b.wins - a.wins || b.gd - a.gd || b.gf - a.gf || a.seed - b.seed || a.team.localeCompare(b.team)).map((item) => item.team);
  }

  function resolveTournament(sourceGames) {
    const knownTeams = teamsFromGames(sourceGames);
    const games = (sourceGames || []).map((game) => ({
      ...game,
      whiteTeam: smartTeam(game.whiteRaw) || assignedRouteTeam(game.whiteRaw, knownTeams),
      darkTeam: smartTeam(game.darkRaw) || assignedRouteTeam(game.darkRaw, knownTeams)
    }));
    const map = new Map(games.map((game) => [game.game, game]));
    const slots = new Map();
    const groupPlacements = new Map();
    const poolPlacements = new Map();
    const seedLookup = new Map();

    for (const game of games) {
      for (const raw of [game.whiteRaw, game.darkRaw]) {
        const info = seedInfo(raw);
        if (info) seedLookup.set(info.team, info.seed);
      }
      for (const side of ["white", "dark"]) {
        const raw = game[`${side}Raw`];
        const team = game[`${side}Team`] || assignedRouteTeam(raw, knownTeams);
        if (!team) continue;
        const slot = parsePoolSlot(raw);
        const poolPlacement = parsePoolPlacement(raw);
        const groupPlacement = parseGroupPlacement(raw);
        if (slot && !slots.has(slot.key)) slots.set(slot.key, team);
        if (poolPlacement && !poolPlacements.has(`${poolPlacement.key}:${poolPlacement.rank}`)) poolPlacements.set(`${poolPlacement.key}:${poolPlacement.rank}`, team);
        if (groupPlacement && !groupPlacements.has(`${groupPlacement.key}:${groupPlacement.rank}`)) groupPlacements.set(`${groupPlacement.key}:${groupPlacement.rank}`, team);
      }
    }

    let changed = true;
    let guard = 0;
    while (changed && guard++ < 50) {
      changed = false;
      for (const game of games) {
        for (const side of ["white", "dark"]) {
          const key = `${side}Team`;
          const raw = game[`${side}Raw`];
          if (game[key]) continue;
          const assigned = assignedRouteTeam(raw, knownTeams);
          if (assigned) {
            game[key] = assigned;
            changed = true;
            continue;
          }
          const wl = parseWL(raw);
          if (wl) {
            const source = map.get(wl.game);
            const result = outcome(source);
            if (result) {
              game[key] = wl.kind === "W" ? result.winner : result.loser;
              changed = true;
              continue;
            }
          }
          const matchup = parsePoolMatchup(raw);
          if (matchup) {
            const source = sourceGamesForPoolMatchup(games, matchup, game).find(isFinal);
            const result = outcome(source);
            if (result) {
              game[key] = matchup.kind === "W" ? result.winner : result.loser;
              changed = true;
              continue;
            }
          }
          const slot = parsePoolSlot(raw);
          const poolPlacement = parsePoolPlacement(raw);
          const groupPlacement = parseGroupPlacement(raw);
          if (slot && slots.has(slot.key)) {
            game[key] = slots.get(slot.key);
            changed = true;
          } else if (poolPlacement && poolPlacements.has(`${poolPlacement.key}:${poolPlacement.rank}`)) {
            game[key] = poolPlacements.get(`${poolPlacement.key}:${poolPlacement.rank}`);
            changed = true;
          } else if (groupPlacement && groupPlacements.has(`${groupPlacement.key}:${groupPlacement.rank}`)) {
            game[key] = groupPlacements.get(`${groupPlacement.key}:${groupPlacement.rank}`);
            changed = true;
          }
        }
      }

      for (const game of games) {
        const result = outcome(game);
        if (!result) continue;
        for (const [destination, team] of [[game.winnerTo, result.winner], [game.loserTo, result.loser]]) {
          const slot = parsePoolSlot(destination);
          if (slot && !slots.has(slot.key)) {
            slots.set(slot.key, team);
            changed = true;
          }
        }
      }

      const groups = new Map();
      for (const game of games) {
        const white = seedInfo(game.whiteRaw);
        const dark = seedInfo(game.darkRaw);
        if (!white || !dark || !white.group || white.group !== dark.group) continue;
        if (!groups.has(white.group)) groups.set(white.group, { games: [], teams: new Set() });
        groups.get(white.group).games.push(game);
        groups.get(white.group).teams.add(white.team);
        groups.get(white.group).teams.add(dark.team);
      }
      for (const [group, bucket] of groups) {
        if (!bucket.games.length || !bucket.games.every(isFinal)) continue;
        rankTable([...bucket.teams], bucket.games, seedLookup).slice(0, 5).forEach((team, index) => {
          const key = `${group}:${index + 1}`;
          if (!groupPlacements.has(key)) {
            groupPlacements.set(key, team);
            changed = true;
          }
        });
      }

      const pools = new Map();
      for (const game of games) {
        const white = parsePoolSlot(game.whiteRaw);
        const dark = parsePoolSlot(game.darkRaw);
        if (!white || !dark || white.track !== dark.track || white.pool !== dark.pool) continue;
        const key = `${white.track}_${white.pool}`;
        if (!pools.has(key)) pools.set(key, { games: [], teams: new Set() });
        pools.get(key).games.push(game);
        if (game.whiteTeam) pools.get(key).teams.add(game.whiteTeam);
        if (game.darkTeam) pools.get(key).teams.add(game.darkTeam);
      }
      for (const [key, bucket] of pools) {
        if (!bucket.games.length || !bucket.games.every(isFinal)) continue;
        rankTable([...bucket.teams], bucket.games, seedLookup).slice(0, 5).forEach((team, index) => {
          const placementKey = `${key}:${index + 1}`;
          if (!poolPlacements.has(placementKey)) {
            poolPlacements.set(placementKey, team);
            changed = true;
          }
        });
      }
    }

    return { games: games.sort(gameSort), seedLookup };
  }

  function sourceUrls(config) {
    const root = `https://docs.google.com/spreadsheets/d/${config.sheetId}`;
    const sheetNames = unique([config.sheetName, ...(config.sheetNameAliases || [])]);
    const gids = unique([config.gid, ...(config.gidAliases || [])]);
    return [
      `${RELAY_BASE}/${config.eventId}/${encodeURIComponent(config.id)}.csv`,
      ...sheetNames.map((name) => `${root}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`),
      ...gids.flatMap((gid) => [`${root}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`, `${root}/export?format=csv&gid=${encodeURIComponent(gid)}`]),
      config.snapshotPath
    ];
  }

  async function fetchText(url, timeoutMs = 9000) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => controller?.abort(), timeoutMs);
    try {
      const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`, { cache: "no-store", signal: controller?.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (/^\s*<!doctype|^\s*<html|accounts\.google\.com/i.test(text)) throw new Error("HTML returned instead of CSV");
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  function configForProfile(profile) {
    const divisionId = String(profile?.divisionId || "");
    return CONFIGS.find((config) => config.id === divisionId)
      || (divisionId === "10u-boys-championship" ? CONFIGS.find((config) => config.id === "10u-championship" && config.gender === "boys") : null)
      || null;
  }

  function gameForTeam(game, teamName) {
    const target = identityKey(teamName);
    const white = identityKey(game.whiteTeam);
    const dark = identityKey(game.darkTeam);
    if (!target || (white !== target && dark !== target)) return null;
    const side = white === target ? "white" : "dark";
    const opponentSide = side === "white" ? "dark" : "white";
    const parts = gameScoreParts(game);
    const final = isFinal(game);
    const result = final ? (scoreOutcome(game) === side ? "W" : "L") : "";
    return {
      gameId: game.gmid || String(game.game),
      gameNumber: game.game,
      dateLabel: game.date,
      timeLabel: game.time,
      venue: game.location,
      stage: game.stageDetail || game.type || "Tournament game",
      opponent: game[`${opponentSide}Team`] || titleTeam(game[`${opponentSide}Raw`]) || "Opponent pending",
      result,
      scoreFor: parts[side]?.regulation ?? null,
      scoreAgainst: parts[opponentSide]?.regulation ?? null,
      scoreDisplay: final ? scoreDisplay(side === "white" ? game : { ...game, whiteScore: game.darkScore, darkScore: game.whiteScore }) : "",
      shootout: final && (parts.white?.shootout != null || parts.dark?.shootout != null) ? {
        for: parts[side]?.shootout ?? 0,
        against: parts[opponentSide]?.shootout ?? 0
      } : null,
      status: final ? "final" : "scheduled"
    };
  }

  async function load(profile) {
    const config = configForProfile(profile);
    if (!config) throw new Error("No JO source configuration is available for this division.");
    const errors = [];
    let best = null;
    for (const url of sourceUrls(config)) {
      try {
        const text = await fetchText(url);
        const parsed = parseRows(parseCSV(text));
        if (parsed.length < 5) throw new Error(`Only ${parsed.length} games returned`);
        const resolved = resolveTournament(parsed);
        const teamGames = resolved.games.map((game) => gameForTeam(game, profile.team)).filter(Boolean);
        const finalGames = teamGames.filter((game) => game.status === "final");
        const candidate = { sourceUrl: url, sourceLabel: url.includes("cpi-live-relay") ? "WPI live relay" : url.includes("docs.google.com") ? "Official JO sheet" : "Verified WPI snapshot", seed: resolved.seedLookup.get(titleTeam(profile.team)) || null, games: teamGames, finalGames };
        if (!best || candidate.finalGames.length > best.finalGames.length || (candidate.finalGames.length === best.finalGames.length && candidate.games.length > best.games.length)) best = candidate;
        if (candidate.finalGames.length && (!profile.recordSummary?.games || candidate.finalGames.length >= Number(profile.recordSummary.games))) break;
      } catch (error) {
        errors.push(`${url}: ${error?.message || String(error)}`);
      }
    }
    if (!best) throw new Error(errors.slice(-3).join(" | ") || "No JO game source loaded.");
    return best;
  }

  window.WPI_JO_LIVE_HISTORY = {
    release: RELEASE,
    load,
    _test: { parseCSV, parseRows, resolveTournament, gameForTeam, scoreDisplay, identityKey, configForProfile }
  };
})();
