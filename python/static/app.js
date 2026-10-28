"use strict";

const STOPS = [
  [0, [24, 78, 68]],
  [0.42, [86, 158, 128]],
  [0.72, [224, 176, 90]],
  [1, [246, 236, 214]],
];

const state = {
  metricId: "life",
  selectedId: "392",
  query: "",
  order: "desc",
  hoverId: null,
};

let sample = null;
let byId = new Map();
let features = [];
let path = null;
let size = { w: 1, h: 1 };
let svg = null;
let group = null;
let zoomBehavior = null;
let wrap = null;
let panning = false;

const $ = (id) => document.getElementById(id);

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "\u0026amp;";
      case "<":
        return "\u0026lt;";
      case ">":
        return "\u0026gt;";
      case '"':
        return "\u0026quot;";
      default:
        return "\u0026#39;";
    }
  });
}

function trimNum(value, digits) {
  return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function compactCount(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1e9) return `${sign}${trimNum(abs / 1e9, 2)}B`;
  if (abs >= 1e8) return `${sign}${trimNum(abs / 1e6, 0)}M`;
  if (abs >= 1e7) return `${sign}${trimNum(abs / 1e6, 1)}M`;
  if (abs >= 1e6) return `${sign}${trimNum(abs / 1e6, 2)}M`;
  if (abs >= 1e5) return `${sign}${trimNum(abs / 1e3, 0)}k`;
  if (abs >= 1e4) return `${sign}${trimNum(abs / 1e3, 1)}k`;
  return sign + Math.round(abs).toLocaleString("en-US");
}

function percent(n) {
  const digits = Math.abs(n - Math.round(n)) < 0.05 ? 0 : 1;
  return `${n.toFixed(digits)}%`;
}

function formatters(metric) {
  if (metric.id === "life") {
    return {
      format: (n) => `${n.toFixed(1)} years`,
      compact: (n) => n.toFixed(1),
      delta: (n) => `${n.toFixed(1)} years`,
      legend: (n) => `${Math.round(n)} yrs`,
    };
  }
  if (metric.id === "gdp") {
    const usd = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
    return {
      format: usd,
      compact: (n) => `$${compactCount(n)}`,
      delta: usd,
      legend: (n) => `$${compactCount(n)}`,
    };
  }
  if (metric.id === "pop") {
    const full = (n) => Math.round(n).toLocaleString("en-US");
    return { format: full, compact: compactCount, delta: compactCount, legend: compactCount };
  }
  return { format: percent, compact: percent, delta: (n) => `${Math.round(n)} points`, legend: percent };
}

function colorAt(t) {
  const x = Math.min(1, Math.max(0, t));
  let index = 0;
  while (index < STOPS.length - 2 && x > STOPS[index + 1][0]) index += 1;
  const [t0, c0] = STOPS[index];
  const [t1, c1] = STOPS[index + 1];
  const u = (x - t0) / (t1 - t0 || 1);
  const rgb = c0.map((channel, i) => Math.round(channel + (c1[i] - channel) * u));
  return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
}

function legendGradient() {
  return `linear-gradient(to right, ${STOPS.map(([t, rgb]) => `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]}) ${Math.round(t * 100)}%`).join(", ")})`;
}

function position(scale, value, min, max) {
  if (!(max > min)) return 0.5;
  if (scale === "log") {
    const safe = (n) => Math.log(Math.max(n, 1e-9));
    return (safe(value) - safe(min)) / (safe(max) - safe(min));
  }
  return (value - min) / (max - min);
}

function medianOf(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function metricById(id) {
  return sample.metrics.find((metric) => metric.id === id);
}

function summarize(metricId) {
  const metric = metricById(metricId);
  const rows = sample.countries
    .filter((country) => country[metricId] != null)
    .map((country) => ({ ...country, value: country[metricId] }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });
  const values = rows.map((row) => row.value);
  return {
    metric,
    rows,
    min: values.length ? values[values.length - 1] : 0,
    max: values.length ? values[0] : 0,
    median: medianOf(values),
    count: rows.length,
    rankOf: new Map(rows.map((row) => [row.id, row.rank])),
  };
}

function colorFor(value, summary) {
  if (value == null || !summary.count) return "var(--nodata)";
  return colorAt(position(summary.metric.scale, value, summary.min, summary.max));
}

function medianPhrase(metric, value, median) {
  const delta = value - median;
  const relative = median === 0 ? Math.abs(delta) : Math.abs(delta / median);
  const close =
    metric.id === "life"
      ? Math.abs(delta) < 0.15
      : metric.id === "gdp" || metric.id === "pop"
        ? relative < 0.03
        : Math.abs(delta) < 0.5;
  if (close) return "In line with the median";
  const fmt = formatters(metric);
  return `${fmt.delta(Math.abs(delta))} ${delta > 0 ? "above" : "below"} the median`;
}

function featureId(raw, name) {
  if (raw != null && String(raw) !== "undefined") return String(raw);
  if (name === "N. Cyprus") return "n-cyprus";
  if (name === "Somaliland") return "somaliland";
  if (name === "Kosovo") return "kosovo";
  return `x:${name}`;
}

function motionMs() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700;
}

function pointOf(event) {
  if (!event) return null;
  const touch = event.changedTouches && event.changedTouches[0];
  if (touch) return { x: touch.clientX, y: touch.clientY };
  if (typeof event.clientX === "number") return { x: event.clientX, y: event.clientY };
  return null;
}

function runZoom(apply) {
  const selection = d3.select(svg).interrupt();
  const duration = motionMs();
  apply(duration ? selection.transition().duration(duration) : selection);
}

function zoomTo(id) {
  const feature = features.find((item) => item.id === id);
  if (!svg || !zoomBehavior || !path || !feature) return;
  const [[x0, y0], [x1, y1]] = path.bounds(feature);
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (dx < 1 || dy < 1) return;
  const scale = Math.max(1, Math.min(8, 0.62 / Math.max(dx / size.w, dy / size.h)));
  const next = d3.zoomIdentity
    .translate(size.w / 2, size.h / 2)
    .scale(scale)
    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
  runZoom((selection) => zoomBehavior.transform(selection, next));
}

function choose(id) {
  state.selectedId = id;
  if (id) zoomTo(id);
  render();
  $("panel-scroll").scrollTo({ top: 0, behavior: motionMs() ? "smooth" : "auto" });
}

function placeTip(clientX, clientY) {
  const rect = wrap.getBoundingClientRect();
  let x = clientX - rect.left + 14;
  let y = clientY - rect.top + 16;
  if (x + 232 > rect.width) x = clientX - rect.left - 232 - 10;
  if (y + 96 > rect.height) y = clientY - rect.top - 96 - 10;
  wrap.style.setProperty("--tip-x", `${Math.max(8, x)}px`);
  wrap.style.setProperty("--tip-y", `${Math.max(8, y)}px`);
}

function buildMap() {
  wrap = $("map");
  wrap.innerHTML = "";
  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "map-surface");
  svg.setAttribute("role", "application");
  svg.setAttribute("aria-label", "World map. Drag to pan, scroll or pinch to zoom, tap a country for details.");
  group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(group);
  wrap.appendChild(svg);

  const tip = document.createElement("div");
  tip.id = "tip";
  tip.className = "tip";
  tip.hidden = true;
  wrap.appendChild(tip);

  const sphere = appendPath("sphere");
  sphere.setAttribute("fill", "var(--ocean)");
  sphere.setAttribute("stroke", "var(--line)");
  sphere.setAttribute("stroke-width", "1");
  sphere.setAttribute("vector-effect", "non-scaling-stroke");
  const grat = appendPath("graticule");
  grat.setAttribute("fill", "none");
  grat.setAttribute("stroke", "var(--line)");
  grat.setAttribute("stroke-opacity", "0.85");
  grat.setAttribute("stroke-width", "0.5");
  grat.setAttribute("vector-effect", "non-scaling-stroke");
  grat.setAttribute("pointer-events", "none");

  features.forEach((feature) => {
    const country = appendPath("country");
    country.setAttribute("data-id", feature.id);
    country.dataset.id = feature.id;
  });
  appendPath("hover-stroke").setAttribute("pointer-events", "none");
  appendPath("selected-stroke").setAttribute("pointer-events", "none");

  let moved = false;
  let tapCandidate = false;
  let tapId = null;
  let originX = 0;
  let originY = 0;

  zoomBehavior = d3.zoom()
    .scaleExtent([1, 8])
    .on("start", (event) => {
      const src = event.sourceEvent;
      const type = src ? src.type : "";
      tapCandidate = type === "mousedown" || type === "touchstart";
      moved = false;
      panning = tapCandidate;
      svg.classList.toggle("is-panning", tapCandidate);
      const point = pointOf(src);
      originX = point ? point.x : 0;
      originY = point ? point.y : 0;
      const target = src && src.target;
      tapId = target && target.getAttribute ? target.getAttribute("data-id") : null;
    })
    .on("zoom", (event) => {
      group.setAttribute("transform", event.transform);
      const point = pointOf(event.sourceEvent);
      if (!point) return;
      const dx = point.x - originX;
      const dy = point.y - originY;
      if (dx * dx + dy * dy > 16) moved = true;
    })
    .on("end", () => {
      svg.classList.remove("is-panning");
      panning = false;
      if (moved) setHover(null);
      if (tapCandidate && !moved) choose(tapId);
      tapCandidate = false;
    });

  d3.select(svg).call(zoomBehavior);
  svg.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || panning) return;
    const id = event.target && event.target.getAttribute ? event.target.getAttribute("data-id") : null;
    if (!id) {
      setHover(null);
      return;
    }
    placeTip(event.clientX, event.clientY);
    if (state.hoverId !== id) setHover(id);
  });
  wrap.addEventListener("pointerleave", () => setHover(null));

  new ResizeObserver(draw).observe(wrap);
  draw();
}

function appendPath(className) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
  node.setAttribute("class", className);
  group.appendChild(node);
  return node;
}

function draw() {
  if (!wrap || !zoomBehavior) return;
  const w = Math.round(wrap.clientWidth);
  const h = Math.round(wrap.clientHeight);
  if (w < 20 || h < 20) return;
  size = { w, h };
  const projection = d3.geoNaturalEarth1().fitExtent(
    [[16, 12], [w - 16, h - 12]],
    { type: "Sphere" },
  );
  path = d3.geoPath(projection);
  group.querySelector(".sphere").setAttribute("d", path({ type: "Sphere" }) || "");
  group.querySelector(".graticule").setAttribute("d", path(d3.geoGraticule().step([20, 20])()) || "");
  const nodes = group.querySelectorAll(".country");
  features.forEach((feature, index) => {
    nodes[index].setAttribute("d", path(feature) || "");
  });
  zoomBehavior.extent([[0, 0], [w, h]]).translateExtent([[0, 0], [w, h]]);
  paintCountries();
  paintStrokes();
}

function paintCountries() {
  const summary = summarize(state.metricId);
  group.querySelectorAll(".country").forEach((node) => {
    const country = byId.get(node.getAttribute("data-id"));
    const value = country ? country[state.metricId] : null;
    node.style.fill = colorFor(value, summary);
    node.classList.toggle("is-hot", node.getAttribute("data-id") === state.hoverId);
  });
}

function paintStrokes() {
  const hover = group.querySelector(".hover-stroke");
  const selected = group.querySelector(".selected-stroke");
  const hoverFeature = features.find((feature) => feature.id === state.hoverId);
  const selectedFeature = features.find((feature) => feature.id === state.selectedId);
  hover.setAttribute("d", hoverFeature && state.hoverId !== state.selectedId && path ? path(hoverFeature) || "" : "");
  hover.setAttribute("fill", "none");
  hover.setAttribute("stroke", "var(--foam)");
  hover.setAttribute("stroke-width", "1.6");
  hover.setAttribute("vector-effect", "non-scaling-stroke");
  selected.setAttribute("d", selectedFeature && path ? path(selectedFeature) || "" : "");
  selected.setAttribute("fill", "none");
  selected.setAttribute("stroke", "var(--ochre)");
  selected.setAttribute("stroke-width", "2.25");
  selected.setAttribute("vector-effect", "non-scaling-stroke");
}

function setHover(id) {
  state.hoverId = id;
  const tip = $("tip");
  if (!id) {
    tip.hidden = true;
    paintCountries();
    paintStrokes();
    return;
  }
  const summary = summarize(state.metricId);
  const country = byId.get(id);
  const name = country ? country.name : id;
  const value = country ? country[state.metricId] : null;
  const rank = summary.rankOf.get(id);
  const fmt = formatters(summary.metric);
  tip.hidden = false;
  tip.innerHTML = `<h2>${esc(name)}</h2><p>${value == null ? "No figure" : esc(fmt.format(value))}</p><p class="meta">${rank ? `Rank ${rank} of ${summary.count} · ${esc(summary.metric.short)}` : esc(summary.metric.label)}</p>`;
  paintCountries();
  paintStrokes();
}

function renderChrome() {
  const summary = summarize(state.metricId);
  $("blurb").textContent = summary.metric.blurb;
  $("blurb-mobile").textContent = summary.metric.blurb;
  const bar = $("metrics");
  bar.innerHTML = sample.metrics.map((metric) => {
    const pressed = metric.id === state.metricId ? "true" : "false";
    return `<button type="button" id="metric-${metric.id}" aria-pressed="${pressed}">${esc(metric.label)}</button>`;
  }).join("");
  bar.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.metricId = button.id.replace("metric-", "");
      render();
      button.scrollIntoView({ inline: "nearest", block: "nearest" });
    });
  });
}

function renderLegend(summary) {
  const fmt = formatters(summary.metric);
  const medianT = position(summary.metric.scale, summary.median, summary.min, summary.max);
  const selected = state.selectedId ? byId.get(state.selectedId) : null;
  const selectedValue = selected ? selected[summary.metric.id] : null;
  const selectedT = selectedValue == null ? null : position(summary.metric.scale, selectedValue, summary.min, summary.max);
  $("legend").innerHTML = `
    <div class="legend-head"><strong>${esc(summary.metric.label)}</strong><span>${summary.count} countries</span></div>
    <div class="bar">
      <div class="bar-fill" style="background:${legendGradient()}"></div>
      <span class="tick" style="left:${medianT * 100}%"></span>
      ${selectedT == null ? "" : `<span class="marker" style="left:${Math.min(100, Math.max(0, selectedT * 100))}%"></span>`}
    </div>
    <div class="legend-scale"><span>${esc(fmt.legend(summary.min))}</span><span>median ${esc(fmt.legend(summary.median))}</span><span>${esc(fmt.legend(summary.max))}</span></div>
    <div class="legend-foot"><span class="nodata-key"><i class="swatch"></i>No data</span><span>${summary.metric.scale === "log" ? "Log color scale" : "Linear color scale"}</span></div>`;
}

function renderDetail(summary) {
  const country = state.selectedId ? byId.get(state.selectedId) : null;
  const host = $("detail");
  const live = $("live");
  if (!country) {
    const leader = summary.rows[0];
    host.innerHTML = `<div class="detail"><p class="lead">Select a country on the map, or pick one from the ranking.</p>${leader ? `<p class="lead"><span style="color:var(--fg)">${esc(leader.name)}</span> leads on ${esc(summary.metric.short.toLowerCase())} at <span style="color:var(--fg)">${esc(formatters(summary.metric).format(leader.value))}</span>.</p>` : ""}</div>`;
    live.textContent = "";
    return;
  }
  const value = country[summary.metric.id];
  const rank = summary.rankOf.get(country.id);
  const fmt = formatters(summary.metric);
  const share = rank == null || summary.count < 2 ? 0 : ((summary.count - rank) / (summary.count - 1)) * 100;
  const others = sample.metrics.filter((metric) => metric.id !== summary.metric.id).map((metric) => {
    const metricValue = country[metric.id];
    const metricSummary = summarize(metric.id);
    const t = metricValue == null ? 0 : position(metric.scale, metricValue, metricSummary.min, metricSummary.max);
    const width = metricValue == null ? 0 : Math.min(100, Math.max(0, t * 100));
    return `<button type="button" data-metric="${metric.id}"><span class="metric-line"><span>${esc(metric.label)}</span><span>${metricValue == null ? "—" : esc(formatters(metric).compact(metricValue))}</span></span><span class="track mini"><span style="width:${width}%"></span></span></button>`;
  }).join("");
  const figure = value == null || rank == null
    ? `<p class="compare">No sample figure for ${esc(summary.metric.label.toLowerCase())}.</p>`
    : `<div class="value-row"><p class="hero">${esc(fmt.compact(value))}</p><p class="compare"><span style="color:var(--fg)">#${rank}</span> of ${summary.count}</p></div><p class="unit">${esc(summary.metric.label)}</p><div class="track"><span style="width:${share}%"></span></div><p class="compare">${esc(medianPhrase(summary.metric, value, summary.median))}</p>`;
  host.innerHTML = `<div class="detail rise"><div class="title-row"><div><p class="region">${esc(country.region || "Unassigned")}</p><h2>${esc(country.name)}</h2></div><div><button type="button" class="icon-btn" id="focus" aria-label="Focus on map">⌖</button><button type="button" class="icon-btn" id="clear" aria-label="Clear selection">×</button></div></div>${figure}<div class="also"><p class="also-label">Also measured</p>${others}</div></div>`;
  $("focus").addEventListener("click", () => zoomTo(country.id));
  $("clear").addEventListener("click", () => {
    state.selectedId = null;
    render();
  });
  host.querySelectorAll("[data-metric]").forEach((button) => {
    button.addEventListener("click", () => {
      state.metricId = button.getAttribute("data-metric");
      render();
    });
  });
  live.textContent = `${country.name}. ${summary.metric.label}: ${value == null ? "no figure" : fmt.format(value)}.`;
}

function renderRanking(summary) {
  const needle = state.query.trim().toLowerCase();
  const ordered = state.order === "desc" ? summary.rows : [...summary.rows].reverse();
  const visible = ordered.filter((row) => !needle || row.name.toLowerCase().includes(needle) || (row.region || "").toLowerCase().includes(needle));
  const missing = needle
    ? sample.countries.filter((country) => country[summary.metric.id] == null && (country.name.toLowerCase().includes(needle) || (country.region || "").toLowerCase().includes(needle)))
    : [];
  const fmt = formatters(summary.metric);
  const items = visible.map((row) => `<li><button type="button" data-id="${esc(row.id)}" aria-current="${row.id === state.selectedId}"><span class="rank-no">${row.rank}</span><span class="rank-name">${esc(row.name)}</span><span class="rank-value">${esc(fmt.compact(row.value))}</span></button></li>`).join("");
  const extras = missing.map((country) => `<li><button type="button" data-id="${esc(country.id)}"><span class="rank-no">—</span><span class="rank-name">${esc(country.name)}</span><span class="rank-value">No data</span></button></li>`).join("");
  const body = visible.length || missing.length
    ? `<ul class="rows">${items}${extras}</ul>`
    : `<p class="empty">No country matches that search.</p>`;
  $("ranking").innerHTML = `<div class="rank-head"><p class="rank-label">${needle ? `${visible.length} matches` : "Ranking"}</p><div class="sort"><button type="button" data-order="desc" aria-pressed="${state.order === "desc"}">Highest</button><button type="button" data-order="asc" aria-pressed="${state.order === "asc"}">Lowest</button></div></div>${body}`;
  $("ranking").querySelectorAll("[data-order]").forEach((button) => {
    button.addEventListener("click", () => {
      state.order = button.getAttribute("data-order");
      renderRanking(summarize(state.metricId));
    });
  });
  $("ranking").querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => choose(button.getAttribute("data-id")));
  });
}

function render() {
  const summary = summarize(state.metricId);
  document.querySelectorAll("#metrics button").forEach((button) => {
    button.setAttribute("aria-pressed", button.id === `metric-${state.metricId}`);
  });
  $("blurb").textContent = summary.metric.blurb;
  $("blurb-mobile").textContent = summary.metric.blurb;
  renderLegend(summary);
  renderDetail(summary);
  renderRanking(summary);
  if (group) {
    paintCountries();
    paintStrokes();
    if (state.hoverId) setHover(state.hoverId);
  }
}

async function main() {
  try {
    const [data, world] = await Promise.all([
      fetch("sample.json").then((response) => response.json()),
      fetch("countries-110m.json").then((response) => response.json()),
    ]);
    sample = data;
    byId = new Map(sample.countries.map((country) => [country.id, country]));
    const collection = topojson.feature(world, world.objects.countries);
    features = collection.features.map((feature) => {
      const geoName = (feature.properties && feature.properties.name) || "Unknown";
      const id = featureId(feature.id, geoName);
      feature.id = id;
      return feature;
    });
    renderChrome();
    buildMap();
    render();
    $("search").addEventListener("input", (event) => {
      state.query = event.target.value;
      renderRanking(summarize(state.metricId));
    });
    $("zoom-in").addEventListener("click", () => runZoom((selection) => zoomBehavior.scaleBy(selection, 1.6)));
    $("zoom-out").addEventListener("click", () => runZoom((selection) => zoomBehavior.scaleBy(selection, 1 / 1.6)));
    $("zoom-reset").addEventListener("click", () => runZoom((selection) => zoomBehavior.transform(selection, d3.zoomIdentity)));
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        state.selectedId = null;
        render();
      }
    });
  } catch (error) {
    $("loading").textContent = "The map could not be loaded. Start it with python python/meridian.py and open the address it prints.";
    console.error(error);
  }
}

main();
