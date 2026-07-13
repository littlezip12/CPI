(() => {
  const state = {
    rankings: [],
    issues: [],
    filtered: [],
    group: 'all',
    issueType: 'all',
    search: ''
  };

  const els = {
    statusStrip: document.getElementById('statusStrip'),
    metricGrid: document.getElementById('metricGrid'),
    groupFilter: document.getElementById('groupFilter'),
    issueFilter: document.getElementById('issueFilter'),
    searchInput: document.getElementById('searchInput'),
    resetFilters: document.getElementById('resetFilters'),
    issueCount: document.getElementById('issueCount'),
    issueTable: document.getElementById('issueTable'),
    groupCounts: document.getElementById('groupCounts')
  };

  const ISSUE_LABELS = {
    same_club_age_group: 'Same club / same age',
    possible_alias: 'Possible alias',
    quiksilver_evidence: 'Quiksilver evidence',
    review_flag: 'Review flag',
    missing_logo: 'Missing logo',
    missing_region: 'Missing region'
  };

  async function init() {
    try {
      const response = await fetch(`rankings.json?v=7.33-${Date.now()}`);
      if (!response.ok) throw new Error(`Could not load rankings.json (${response.status})`);
      state.rankings = await response.json();
      state.issues = buildIssues(state.rankings);
      populateFilters(state.rankings);
      renderMetrics();
      renderGroupCounts();
      applyFilters();
      renderStatus('Data loaded from rankings.json. Review flags are prompts, not automatic defects.', 'ok');
    } catch (error) {
      console.error(error);
      renderStatus(`Unable to load ranking data: ${error.message}`, 'error');
      els.issueTable.innerHTML = `<tr><td colspan="7" class="empty-row">Could not load data.</td></tr>`;
    }

    els.groupFilter?.addEventListener('change', () => {
      state.group = els.groupFilter.value;
      applyFilters();
    });

    els.issueFilter?.addEventListener('change', () => {
      state.issueType = els.issueFilter.value;
      applyFilters();
    });

    els.searchInput?.addEventListener('input', () => {
      state.search = els.searchInput.value.trim().toLowerCase();
      applyFilters();
    });

    els.resetFilters?.addEventListener('click', () => {
      state.group = 'all';
      state.issueType = 'all';
      state.search = '';
      els.groupFilter.value = 'all';
      els.issueFilter.value = 'all';
      els.searchInput.value = '';
      applyFilters();
    });
  }

  function buildIssues(rankings) {
    const issues = [];
    const byClubGroup = new Map();
    const byAliasKey = new Map();

    rankings.forEach(team => {
      const clubGroupKey = `${team.group || ''}||${team.clubSlug || team.club || ''}`;
      if (!byClubGroup.has(clubGroupKey)) byClubGroup.set(clubGroupKey, []);
      byClubGroup.get(clubGroupKey).push(team);

      const aliasKey = `${team.group || ''}||${team.clubSlug || ''}||${normalizeTeamName(team.team || '')}`;
      if (!byAliasKey.has(aliasKey)) byAliasKey.set(aliasKey, []);
      byAliasKey.get(aliasKey).push(team);

      const flags = (team.rankingFlags || []).map(flag => String(flag));
      const flagText = flags.join(', ');

      if (!team.logo) {
        issues.push(makeIssue('missing_logo', team, 'No logo path is set on this ranked team.'));
      }

      if (!team.region || ['Needs Review', 'Region TBD'].includes(team.region)) {
        issues.push(makeIssue('missing_region', team, 'Region is missing or still marked for review.'));
      }

      if (flags.some(flag => /quiksilver/i.test(flag)) || /Quiksilver/i.test(team.latestTournament || '')) {
        issues.push(makeIssue('quiksilver_evidence', team, `Quiksilver evidence present: ${team.latestTournamentRecord || 'review placement/context'}.`));
      }

      if (flags.some(flag => /(review|candidate|identity|alias|provisional)/i.test(flag))) {
        issues.push(makeIssue('review_flag', team, `Ranking flag requires review: ${flagText || 'review flag present'}.`));
      }
    });

    for (const rows of byClubGroup.values()) {
      if (rows.length > 1) {
        rows
          .slice()
          .sort((a, b) => Number(a.postRank || 999) - Number(b.postRank || 999))
          .forEach(team => {
            const siblingNames = rows
              .filter(row => row.slug !== team.slug)
              .map(row => `${row.team} (#${row.postRank})`)
              .slice(0, 5)
              .join(', ');
            issues.push(makeIssue(
              'same_club_age_group',
              team,
              `Same club has ${rows.length} teams in ${team.group}. Confirm A/B/C/depth handling. Related: ${siblingNames || 'none'}`
            ));
          });
      }
    }

    for (const rows of byAliasKey.values()) {
      if (rows.length > 1) {
        rows.forEach(team => {
          const related = rows
            .filter(row => row.slug !== team.slug)
            .map(row => `${row.team} (#${row.postRank})`)
            .join(', ');
          issues.push(makeIssue('possible_alias', team, `Similar normalized team name within same club/group. Related: ${related}`));
        });
      }
    }

    return dedupeIssues(issues);
  }

  function makeIssue(type, team, reason) {
    return {
      type,
      label: ISSUE_LABELS[type] || type,
      group: team.group || '',
      rank: team.postRank ?? team.rank ?? '',
      team: team.team || '',
      teamSlug: team.slug || '',
      club: team.club || team.displayClubName || '',
      clubSlug: team.clubSlug || '',
      region: team.region || '',
      reason,
      searchText: [
        type,
        ISSUE_LABELS[type],
        team.group,
        team.postRank,
        team.team,
        team.slug,
        team.club,
        team.clubSlug,
        team.region,
        team.latestTournament,
        (team.rankingFlags || []).join(' '),
        reason
      ].join(' ').toLowerCase()
    };
  }

  function dedupeIssues(issues) {
    const seen = new Set();
    return issues.filter(issue => {
      const key = `${issue.type}||${issue.group}||${issue.teamSlug}||${issue.reason}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function normalizeTeamName(name) {
    return String(name)
      .toLowerCase()
      .replace(/\b(wpc|water polo|club|aquatics|foundation)\b/g, '')
      .replace(/\b(a|b|c|d|black|blue|gold|red|navy|white|orange|green|silver)\b/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function populateFilters(rankings) {
    const groups = [...new Set(rankings.map(team => team.group).filter(Boolean))]
      .sort(groupSorter);

    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = group;
      els.groupFilter.appendChild(option);
    });
  }

  function renderMetrics() {
    const teams = state.rankings.length;
    const clubs = new Set(state.rankings.map(team => team.clubSlug || team.club).filter(Boolean)).size;
    const groups = new Set(state.rankings.map(team => team.group).filter(Boolean)).size;
    const quiksilverRows = state.issues.filter(issue => issue.type === 'quiksilver_evidence').length;
    const sameClubRows = state.issues.filter(issue => issue.type === 'same_club_age_group').length;
    const reviewRows = state.issues.filter(issue => issue.type === 'review_flag' || issue.type === 'possible_alias').length;

    const cards = [
      ['Ranked teams', teams, 'Current rows in rankings.json'],
      ['Clubs', clubs, 'Unique club slugs in ranked data'],
      ['Age groups', groups, 'Active CPI ranking groups'],
      ['Review rows', state.issues.length, 'Total QA prompts'],
      ['Same-club depth', sameClubRows, 'A/B/C team checks'],
      ['Quiksilver evidence', quiksilverRows, 'Rows touched by latest event'],
      ['Alias/review flags', reviewRows, 'Manual review candidates'],
      ['Missing path/region', state.issues.filter(issue => ['missing_logo','missing_region'].includes(issue.type)).length, 'Hard data gaps']
    ];

    els.metricGrid.innerHTML = cards.map(([label, value, note]) => `
      <div class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${Number(value).toLocaleString()}</strong>
        <p>${escapeHtml(note)}</p>
      </div>
    `).join('');
  }

  function renderGroupCounts() {
    const counts = new Map();
    state.rankings.forEach(team => counts.set(team.group, (counts.get(team.group) || 0) + 1));
    const rows = [...counts.entries()].sort((a, b) => groupSorter(a[0], b[0]));
    els.groupCounts.innerHTML = rows.map(([group, count]) => `
      <div class="mini-row">
        <span>${escapeHtml(group)}</span>
        <strong>${count}</strong>
      </div>
    `).join('');
  }

  function applyFilters() {
    state.filtered = state.issues.filter(issue => {
      const groupMatch = state.group === 'all' || issue.group === state.group;
      const typeMatch = state.issueType === 'all' || issue.type === state.issueType;
      const searchMatch = !state.search || issue.searchText.includes(state.search);
      return groupMatch && typeMatch && searchMatch;
    });

    renderIssueTable();
  }

  function renderIssueTable() {
    els.issueCount.textContent = state.filtered.length.toLocaleString();

    if (!state.filtered.length) {
      els.issueTable.innerHTML = `<tr><td colspan="7" class="empty-row">No rows match the current filters.</td></tr>`;
      return;
    }

    els.issueTable.innerHTML = state.filtered
      .slice()
      .sort((a, b) => groupSorter(a.group, b.group) || Number(a.rank || 999) - Number(b.rank || 999) || a.type.localeCompare(b.type))
      .map(issue => `
        <tr>
          <td><span class="issue-type ${escapeAttr(issue.type)}">${escapeHtml(issue.label)}</span></td>
          <td>${escapeHtml(issue.group)}</td>
          <td>#${escapeHtml(issue.rank)}</td>
          <td class="team-cell">
            <strong>${escapeHtml(issue.team)}</strong>
            ${issue.teamSlug ? `<a href="team.html?team=${encodeURIComponent(issue.teamSlug)}">Open team</a>` : ''}
          </td>
          <td>
            ${issue.clubSlug ? `<a href="club.html?club=${encodeURIComponent(issue.clubSlug)}">${escapeHtml(issue.club)}</a>` : escapeHtml(issue.club)}
          </td>
          <td>${escapeHtml(issue.region)}</td>
          <td class="why-cell">${escapeHtml(issue.reason)}</td>
        </tr>
      `).join('');
  }

  function renderStatus(message, type) {
    els.statusStrip.innerHTML = `<div class="status-pill ${type || ''}">${escapeHtml(message)}</div>`;
  }

  function groupSorter(a, b) {
    const order = {
      '10U Boys': 1, '10U Girls': 2, '10U Coed': 3,
      '12U Boys': 10, '12U Girls': 11, '12U Coed': 12,
      '14U Boys': 20, '14U Girls': 21,
      '16U Boys': 30, '16U Girls': 31,
      '18U Boys': 40, '18U Girls': 41
    };
    return (order[a] || 999) - (order[b] || 999) || String(a).localeCompare(String(b));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttr(value) {
    return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  init();
})();
