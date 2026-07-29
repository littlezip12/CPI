window.WPI_SPONSOR_CONFIG = {
  "schemaVersion": 1,
  "release": "7.53.2",
  "updatedAt": "2026-07-28",
  "status": "ready_no_active_campaigns",
  "disclosure": "Sponsorship never influences WPI rankings, results, placements, or editorial decisions.",
  "privacy": {
    "collectsPersonalData": false,
    "usesCookies": false,
    "usesLocalStorage": false,
    "clickTrackingEnabled": false,
    "outboundAttribution": "UTM parameters only"
  },
  "outboundAttribution": {
    "source": "waterpoloindex",
    "medium": "sponsor",
    "campaignParameter": "utm_campaign",
    "placementParameter": "utm_content"
  },
  "placements": [
    {
      "id": "club.presenting",
      "pageTypes": [
        "club"
      ],
      "label": "Presented by",
      "format": "presenting",
      "mount": {
        "selectors": [
          ".wpi-club-hero"
        ],
        "position": "beforebegin"
      },
      "targeting": [
        "club",
        "region"
      ]
    },
    {
      "id": "club.inline",
      "pageTypes": [
        "club"
      ],
      "label": "Club Profile Partner",
      "format": "inline",
      "mount": {
        "selectors": [
          "#club-teams",
          "#club-overview"
        ],
        "position": "afterend"
      },
      "targeting": [
        "club",
        "region"
      ]
    },
    {
      "id": "club.region",
      "pageTypes": [
        "club"
      ],
      "label": "Regional Partner",
      "format": "regional",
      "mount": {
        "selectors": [
          "#club-tournaments",
          ".wpi-club-profile-v7530"
        ],
        "position": "afterend"
      },
      "targeting": [
        "region"
      ]
    },
    {
      "id": "team.presenting",
      "pageTypes": [
        "team"
      ],
      "label": "Presented by",
      "format": "presenting",
      "mount": {
        "selectors": [
          ".team-hero"
        ],
        "position": "beforebegin"
      },
      "targeting": [
        "team",
        "club",
        "group",
        "region"
      ]
    },
    {
      "id": "team.inline",
      "pageTypes": [
        "team"
      ],
      "label": "Team Profile Partner",
      "format": "inline",
      "mount": {
        "selectors": [
          ".wpi-team-history-panel",
          "#tournament-evidence",
          "#historical-tournaments"
        ],
        "position": "afterend"
      },
      "targeting": [
        "team",
        "club",
        "group",
        "region"
      ]
    },
    {
      "id": "rankings.presenting",
      "pageTypes": [
        "rankings"
      ],
      "label": "Rankings Presented by",
      "format": "presenting",
      "mount": {
        "selectors": [
          ".rankings-hero",
          "#groupHub"
        ],
        "position": "beforebegin"
      },
      "targeting": [
        "group",
        "region"
      ]
    },
    {
      "id": "rankings.inline",
      "pageTypes": [
        "rankings"
      ],
      "label": "Rankings Partner",
      "format": "inline",
      "mount": {
        "selectors": [
          "#rankings-list",
          "#groupHub"
        ],
        "position": "afterend"
      },
      "targeting": [
        "group",
        "region"
      ]
    },
    {
      "id": "tournaments.presenting",
      "pageTypes": [
        "tournaments",
        "tournament"
      ],
      "label": "Tournament Coverage Presented by",
      "format": "presenting",
      "mount": {
        "selectors": [
          ".cpi50-tournament-hero",
          "main > section:first-child",
          "main"
        ],
        "position": "beforebegin"
      },
      "targeting": [
        "tournament",
        "group",
        "region"
      ]
    },
    {
      "id": "tournaments.inline",
      "pageTypes": [
        "tournaments",
        "tournament"
      ],
      "label": "Tournament Partner",
      "format": "inline",
      "mount": {
        "selectors": [
          "#jo-results",
          "main > section:nth-of-type(2)",
          "main"
        ],
        "position": "afterend"
      },
      "targeting": [
        "tournament",
        "group",
        "region"
      ]
    },
    {
      "id": "regions.directory",
      "pageTypes": [
        "regions"
      ],
      "label": "Regional Water Polo Partner",
      "format": "regional",
      "mount": {
        "selectors": [
          "#club-directory",
          ".club-intel-dashboard"
        ],
        "position": "beforebegin"
      },
      "targeting": [
        "region"
      ]
    }
  ],
  "campaigns": []
};
