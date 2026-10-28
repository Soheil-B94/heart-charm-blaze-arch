import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { LocateFixed, Minus, Plus, RotateCcw, Search, X } from "lucide-react";
import {
  colorForValue,
  COUNTRIES,
  COUNTRY_MAP,
  legendGradient,
  medianPhrase,
  METRICS,
  position,
  summarize,
  type MetricId,
  type Summary,
} from "@/data/atlas";
import { WorldMap, type MapHandle } from "@/components/world-map";

function GlobeMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-9 text-ochre" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="16" cy="16" rx="4.6" ry="11" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 16h22" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function AtlasApp() {
  const mapRef = useRef<MapHandle>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [metricId, setMetricId] = useState<MetricId>("life");
  const [selectedId, setSelectedId] = useState<string | null>("392");
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const summary = useMemo(() => summarize(metricId), [metricId]);
  const selected = selectedId ? COUNTRY_MAP.get(selectedId) : undefined;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);

  useEffect(() => {
    document
      .getElementById(`metric-${metricId}`)
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [metricId]);

  function choose(id: string | null) {
    setSelectedId(id);
    if (id) mapRef.current?.zoomTo(id);
  }

  const selectedValue = selected ? selected[metricId] : null;
  const selectedRank = selectedId ? summary.rankOf.get(selectedId) : undefined;

  return (
    <main className="flex h-dvh flex-col bg-bg text-fg">
      <header className="shrink-0 border-b border-line px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <GlobeMark />
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-widest text-ochre uppercase">Atlas</p>
              <h1 className="font-display text-3xl leading-none text-fg">Meridian</h1>
            </div>
          </div>
          <p className="hidden max-w-xs text-right text-sm leading-snug text-muted sm:block">
            {summary.metric.blurb}
          </p>
        </div>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {METRICS.map((metric) => {
            const active = metric.id === metricId;
            return (
              <button
                key={metric.id}
                id={`metric-${metric.id}`}
                type="button"
                aria-pressed={active}
                onClick={() => setMetricId(metric.id)}
                className={clsx(
                  "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors duration-200 active:scale-[0.96]",
                  active
                    ? "border-ochre bg-ochre text-ink"
                    : "border-line bg-transparent text-muted hover:border-muted hover:text-fg",
                )}
              >
                {metric.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-muted sm:hidden">{summary.metric.blurb}</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative min-h-0 shrink-0 basis-3/5 lg:min-w-0 lg:flex-1 lg:basis-0">
          <WorldMap
            ref={mapRef}
            summary={summary}
            selectedId={selectedId}
            onSelect={choose}
          />
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
            <Legend summary={summary} selectedValue={selectedValue ?? null} />
            <div className="pointer-events-auto flex flex-col overflow-hidden rounded-card border border-line bg-surface/95">
              <MapButton label="Zoom in" onClick={() => mapRef.current?.zoomBy(1.6)}>
                <Plus className="size-5" />
              </MapButton>
              <MapButton label="Zoom out" onClick={() => mapRef.current?.zoomBy(1 / 1.6)}>
                <Minus className="size-5" />
              </MapButton>
              <MapButton label="Reset view" onClick={() => mapRef.current?.reset()}>
                <RotateCcw className="size-5" />
              </MapButton>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 shrink-0 basis-2/5 flex-col border-t border-line bg-surface lg:w-96 lg:basis-auto lg:border-t-0 lg:border-l">
          <div className="shrink-0 border-b border-line p-3">
            <label className="relative block">
              <span className="sr-only">Search countries</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search countries"
                className="h-11 w-full rounded-full border border-line bg-bg pr-10 pl-10 text-sm text-fg outline-none placeholder:text-faint focus:border-ochre"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>
          </div>

          <div ref={scrollerRef} className="panel-scroll min-h-0 flex-1 overflow-y-auto">
            <p className="sr-only" aria-live="polite">
              {selected
                ? `${selected.name}. ${summary.metric.label}: ${
                    selectedValue == null ? "no figure" : summary.metric.format(selectedValue)
                  }.`
                : ""}
            </p>
            {selected ? (
              <CountryDetail
                key={selected.id}
                countryId={selected.id}
                summary={summary}
                onMetric={setMetricId}
                onClear={() => setSelectedId(null)}
                onFocus={() => mapRef.current?.zoomTo(selected.id)}
              />
            ) : (
              <EmptyDetail summary={summary} />
            )}
            <Ranking
              summary={summary}
              query={query}
              order={order}
              selectedId={selectedId}
              onOrder={setOrder}
              onSelect={choose}
            />
            <p className="px-4 pt-2 pb-4 text-xs leading-relaxed text-faint">
              Sample figures, rounded from public estimates around 2023. For exploring the
              map, not official statistics.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center border-b border-line text-fg transition-colors last:border-b-0 hover:bg-raised active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

function Legend({
  summary,
  selectedValue,
}: {
  summary: Summary;
  selectedValue: number | null;
}) {
  const medianT = position(summary.metric.scale, summary.median, summary.min, summary.max);
  const selectedT =
    selectedValue == null
      ? null
      : position(summary.metric.scale, selectedValue, summary.min, summary.max);

  return (
    <div className="pointer-events-none min-w-0 max-w-sm flex-1 rounded-card border border-line bg-surface/95 px-3 py-2.5 backdrop-blur-md">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-fg">{summary.metric.label}</p>
        <p className="shrink-0 text-xs text-faint">{summary.count} countries</p>
      </div>
      <div className="relative mt-2 h-2.5">
        <div
          className="h-full rounded-full"
          style={{ background: legendGradient() }}
        />
        <span
          className="absolute top-[-3px] h-4 w-px bg-fg"
          style={{ left: `${medianT * 100}%` }}
        />
        {selectedT != null ? (
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bg bg-fg"
            style={{ left: `${Math.min(100, Math.max(0, selectedT * 100))}%` }}
          />
        ) : null}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs text-muted tabular-nums">
        <span>{summary.metric.legend(summary.min)}</span>
        <span className="text-faint">median {summary.metric.legend(summary.median)}</span>
        <span>{summary.metric.legend(summary.max)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-faint">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-nodata" />
          No data
        </span>
        {summary.metric.scale === "log" ? <span>Log color scale</span> : <span>Linear color scale</span>}
      </div>
    </div>
  );
}

function EmptyDetail({ summary }: { summary: Summary }) {
  const leader = summary.rows[0];
  if (!leader) return null;
  return (
    <div className="border-b border-line px-4 py-4">
      <p className="text-sm leading-relaxed text-muted">
        Select a country on the map, or pick one from the ranking.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        <span className="text-fg">{leader.name}</span> leads on {summary.metric.short.toLowerCase()}{" "}
        at <span className="text-fg tabular-nums">{summary.metric.format(leader.value)}</span>.
      </p>
    </div>
  );
}

function CountryDetail({
  countryId,
  summary,
  onMetric,
  onClear,
  onFocus,
}: {
  countryId: string;
  summary: Summary;
  onMetric: (id: MetricId) => void;
  onClear: () => void;
  onFocus: () => void;
}) {
  const country = COUNTRY_MAP.get(countryId);
  if (!country) return null;
  const value = country[summary.metric.id];
  const rank = summary.rankOf.get(country.id);
  const share =
    rank == null || summary.count < 2 ? 0 : ((summary.count - rank) / (summary.count - 1)) * 100;

  return (
    <div className="rise border-b border-line px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs tracking-widest text-ochre uppercase">
            {country.region ?? "Unassigned"}
          </p>
          <h2 className="font-display text-3xl leading-tight text-fg">{country.name}</h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onFocus}
            aria-label="Focus on map"
            className="flex size-11 items-center justify-center rounded-full border border-line text-fg hover:bg-raised active:scale-[0.96]"
          >
            <LocateFixed className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="flex size-11 items-center justify-center rounded-full border border-line text-muted hover:text-fg active:scale-[0.96]"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {value == null || rank == null ? (
        <p className="mt-4 text-sm text-muted">No sample figure for {summary.metric.label.toLowerCase()}.</p>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <p className="font-display text-4xl leading-none text-fg tabular-nums">
              {summary.metric.compact(value)}
            </p>
            <p className="pb-1 text-right text-sm text-muted">
              <span className="text-fg tabular-nums">#{rank}</span> of {summary.count}
            </p>
          </div>
          <p className="mt-1 text-xs text-faint">{summary.metric.label}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-ochre" style={{ width: `${share}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">{medianPhrase(summary.metric, value, summary.median)}</p>
        </>
      )}

      <div className="mt-4">
        <p className="text-xs tracking-widest text-faint uppercase">Also measured</p>
        <ul className="mt-2 flex flex-col">
          {METRICS.filter((metric) => metric.id !== summary.metric.id).map((metric) => {
            const metricValue = country[metric.id];
            const metricSummary = summarize(metric.id);
            const t =
              metricValue == null
                ? 0
                : position(metric.scale, metricValue, metricSummary.min, metricSummary.max);
            return (
              <li key={metric.id}>
                <button
                  type="button"
                  onClick={() => onMetric(metric.id)}
                  className="flex w-full flex-col rounded-lg px-2 py-2 text-left hover:bg-raised active:scale-[0.96]"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-muted">{metric.label}</span>
                    <span className="text-sm text-fg tabular-nums">
                      {metricValue == null ? "—" : metric.compact(metricValue)}
                    </span>
                  </span>
                  <span className="mt-1 h-1 overflow-hidden rounded-full bg-bg">
                    <span
                      className="block h-full rounded-full bg-ochre"
                      style={{ width: metricValue == null ? "0%" : `${Math.min(100, Math.max(0, t * 100))}%` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Ranking({
  summary,
  query,
  order,
  selectedId,
  onOrder,
  onSelect,
}: {
  summary: Summary;
  query: string;
  order: "desc" | "asc";
  selectedId: string | null;
  onOrder: (order: "desc" | "asc") => void;
  onSelect: (id: string) => void;
}) {
  const needle = query.trim().toLowerCase();
  const ordered = order === "desc" ? summary.rows : [...summary.rows].reverse();
  const visible = ordered.filter((row) => {
    if (!needle) return true;
    return (
      row.name.toLowerCase().includes(needle) ||
      (row.region ?? "").toLowerCase().includes(needle)
    );
  });
  const missing = needle
    ? COUNTRIES.filter((country) => {
        const value = country[summary.metric.id];
        if (value != null) return false;
        return (
          country.name.toLowerCase().includes(needle) ||
          (country.region ?? "").toLowerCase().includes(needle)
        );
      })
    : [];

  return (
    <div className="px-2 pt-3">
      <div className="flex items-center justify-between gap-2 px-2">
        <p className="text-xs tracking-widest text-faint uppercase">
          {needle ? `${visible.length} matches` : "Ranking"}
        </p>
        <div className="flex rounded-full border border-line p-0.5">
          <SortButton active={order === "desc"} onClick={() => onOrder("desc")}>
            Highest
          </SortButton>
          <SortButton active={order === "asc"} onClick={() => onOrder("asc")}>
            Lowest
          </SortButton>
        </div>
      </div>
      {visible.length === 0 && missing.length === 0 ? (
        <p className="px-2 py-6 text-sm text-muted">No country matches that search.</p>
      ) : (
        <ul className="mt-1">
          {visible.map((row) => {
            const active = row.id === selectedId;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id)}
                  className={clsx(
                    "flex h-11 w-full items-center gap-3 rounded-lg px-2 text-left active:scale-[0.96]",
                    active ? "bg-raised" : "hover:bg-raised",
                  )}
                >
                  <span
                    className={clsx(
                      "w-8 shrink-0 text-right text-xs tabular-nums",
                      active ? "text-ochre" : "text-faint",
                    )}
                  >
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{row.name}</span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {summary.metric.compact(row.value)}
                  </span>
                </button>
              </li>
            );
          })}
          {missing.map((country) => (
            <li key={country.id}>
              <button
                type="button"
                onClick={() => onSelect(country.id)}
                className="flex h-11 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-raised"
              >
                <span className="w-8 shrink-0 text-right text-xs text-faint">—</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{country.name}</span>
                <span className="shrink-0 text-xs text-faint">No data</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "h-8 rounded-full px-3 text-xs font-medium",
        active ? "bg-ochre text-ink" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
