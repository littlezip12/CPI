/* WPI 7.54.18 — national club region map */
(function () {
  const mount = document.querySelector("#wpiClubRegionMap");
  const legend = document.querySelector("#wpiClubRegionLegend");
  const california = document.querySelector("#wpiCaliforniaRegionFilters");
  const status = document.querySelector("#wpiMapSelection");
  if (!mount || !legend) return;

  const clubs = Array.isArray(window.CPI_CLUBS) ? window.CPI_CLUBS : [];
  const CA_REGIONS = [
    "San Diego", "Orange County", "Los Angeles", "Inland Empire", "Central Coast",
    "Central Valley", "Sacramento", "East Bay", "Peninsula / San Francisco"
  ];
  const NATIONAL_REGIONS = [
    "Hawaii", "Northwest", "Southwest", "Mountain West", "Midwest", "Northeast", "Southeast", "International"
  ];
  const REGION_FILTER_VALUE = {
    California: "__california__",
    "Outside California": "__outside_california__"
  };

  function countFor(region) {
    if (region === "California") return clubs.filter((club) => club.state === "CA" || CA_REGIONS.includes(club.region)).length;
    if (region === "Outside California") return clubs.filter((club) => club.state !== "CA" && !CA_REGIONS.includes(club.region)).length;
    return clubs.filter((club) => club.region === region).length;
  }

  function filterValue(region) {
    return REGION_FILTER_VALUE[region] || region;
  }

  function applyFilter(region) {
    const value = filterValue(region);
    window.dispatchEvent(new CustomEvent("wpi:club-region-filter", { detail: { value, scroll: true } }));
    selectMapRegion(region);
  }

  function selectMapRegion(region) {
    const mapRegion = CA_REGIONS.includes(region) ? "California" : region;
    mount.querySelectorAll(".wpi-state").forEach((state) => {
      const matches = state.dataset.region === mapRegion;
      state.classList.toggle("is-selected", matches);
      state.classList.toggle("is-muted", Boolean(mapRegion && mapRegion !== "International") && !matches);
    });
    document.querySelectorAll("[data-wpi-map-region]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.wpiMapRegion === region);
    });
    if (status) {
      const count = countFor(region);
      status.innerHTML = `<strong>${region}</strong><span>${count} club${count === 1 ? "" : "s"} in the WPI directory</span>`;
    }
  }

  function buttonMarkup(region) {
    const count = countFor(region);
    return `<button type="button" data-wpi-map-region="${region}"><span class="wpi-map-swatch wpi-map-swatch--${region.toLowerCase().replace(/[^a-z0-9]+/g, "-")}"></span><strong>${region}</strong><em>${count}</em></button>`;
  }

  legend.innerHTML = ["California", ...NATIONAL_REGIONS].map(buttonMarkup).join("");
  if (california) california.innerHTML = CA_REGIONS.map(buttonMarkup).join("");

  document.querySelectorAll("[data-wpi-map-region]").forEach((button) => {
    button.addEventListener("click", () => applyFilter(button.dataset.wpiMapRegion));
  });

  fetch("assets/maps/wpi-us-club-regions.svg?v=7.54.18", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((svg) => {
      mount.innerHTML = svg;
      mount.querySelectorAll(".wpi-state").forEach((state) => {
        const region = state.dataset.region || "";
        const stateName = state.querySelector("title")?.textContent || state.dataset.state || "State";
        const count = countFor(region);
        state.setAttribute("aria-label", `${stateName}: ${region} region, ${count} WPI club${count === 1 ? "" : "s"}`);
        const activate = () => applyFilter(region);
        state.addEventListener("click", activate);
        state.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        });
      });
      selectMapRegion("");
    })
    .catch((error) => {
      console.error("Unable to load WPI club map", error);
      mount.innerHTML = `<div class="wpi-map-fallback"><strong>Map unavailable</strong><span>Use the regional filters to explore clubs.</span></div>`;
    });
})();
