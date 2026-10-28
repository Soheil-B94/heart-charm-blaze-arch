import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { geoGraticule, geoNaturalEarth1, geoPath, type GeoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import {
  colorForValue,
  COUNTRY_MAP,
  displayName,
  type Summary,
} from "@/data/atlas";
import { MAP_FEATURES } from "@/data/world";

export type MapHandle = {
  zoomTo: (id: string) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
};

type Props = {
  summary: Summary;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function motionMs(): number {
  if (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return 0;
  }
  return 700;
}

function pointOf(event: Event | null): { x: number; y: number } | null {
  if (!event) return null;
  if ("changedTouches" in event) {
    const touch = (event as TouchEvent).changedTouches?.[0];
    if (touch) return { x: touch.clientX, y: touch.clientY };
  }
  if ("clientX" in event && "clientY" in event) {
    const mouse = event as MouseEvent;
    return { x: mouse.clientX, y: mouse.clientY };
  }
  return null;
}

function placeTip(el: HTMLElement, clientX: number, clientY: number) {
  const rect = el.getBoundingClientRect();
  let x = clientX - rect.left + 14;
  let y = clientY - rect.top + 16;
  if (x + 232 > rect.width) x = clientX - rect.left - 232 - 10;
  if (y + 96 > rect.height) y = clientY - rect.top - 96 - 10;
  el.style.setProperty("--tip-x", `${Math.max(8, x)}px`);
  el.style.setProperty("--tip-y", `${Math.max(8, y)}px`);
}

function runZoom(
  svg: SVGSVGElement,
  apply: (selection: unknown) => void,
) {
  const selection = select(svg).interrupt();
  const duration = motionMs();
  if (duration === 0) {
    apply(selection);
    return;
  }
  apply(selection.transition().duration(duration));
}

export const WorldMap = forwardRef<MapHandle, Props>(function WorldMap(
  { summary, selectedId, onSelect },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior | null>(null);
  const pathRef = useRef<GeoPath | null>(null);
  const sizeRef = useRef({ w: 1, h: 1 });
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const onSelectRef = useRef(onSelect);
  const panningRef = useRef(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);

  onSelectRef.current = onSelect;

  const sizeKey = `${size.w}x${size.h}`;
  const seenSize = useRef(sizeKey);
  if (seenSize.current !== sizeKey) {
    seenSize.current = sizeKey;
    transformRef.current = zoomIdentity;
  }

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const drawn = useMemo(() => {
    if (size.w < 20 || size.h < 20) return null;
    const projection = geoNaturalEarth1();
    projection.fitExtent(
      [
        [16, 12],
        [size.w - 16, size.h - 12],
      ],
      { type: "Sphere" },
    );
    const path = geoPath(projection);
    pathRef.current = path;
    sizeRef.current = { w: size.w, h: size.h };
    const countries = MAP_FEATURES.flatMap((item) => {
      const d = path(item.feature) ?? "";
      if (!d) return [];
      return [{ id: item.id, name: displayName(item.id, item.name), d }];
    });
    return {
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule().step([20, 20])()) ?? "",
      countries,
    };
  }, [size.h, size.w]);

  useLayoutEffect(() => {
    const group = gRef.current;
    if (!group) return;
    const transform = transformRef.current;
    if (transform.k === 1 && transform.x === 0 && transform.y === 0) {
      group.removeAttribute("transform");
      return;
    }
    group.setAttribute("transform", transform.toString());
  });

  useEffect(() => {
    const svg = svgRef.current;
    const group = gRef.current;
    if (!svg || !group || size.w < 20 || size.h < 20) return;

    transformRef.current = zoomIdentity;
    group.removeAttribute("transform");

    let moved = false;
    let tapCandidate = false;
    let tapId: string | null = null;
    let originX = 0;
    let originY = 0;

    const behavior = zoom()
      .scaleExtent([1, 8])
      .extent([
        [0, 0],
        [size.w, size.h],
      ])
      .translateExtent([
        [0, 0],
        [size.w, size.h],
      ])
      .on("start", (event) => {
        const src = event.sourceEvent;
        const type = src?.type ?? "";
        tapCandidate = type === "mousedown" || type === "touchstart";
        moved = false;
        panningRef.current = tapCandidate;
        if (tapCandidate) svg.classList.add("is-panning");
        const point = pointOf(src);
        originX = point?.x ?? 0;
        originY = point?.y ?? 0;
        const target = src && "target" in src ? (src.target as Element | null) : null;
        tapId = target?.getAttribute?.("data-id") ?? null;
      })
      .on("zoom", (event) => {
        transformRef.current = event.transform;
        group.setAttribute("transform", event.transform.toString());
        const point = pointOf(event.sourceEvent);
        if (!point) return;
        const dx = point.x - originX;
        const dy = point.y - originY;
        if (dx * dx + dy * dy > 16) moved = true;
      })
      .on("end", () => {
        svg.classList.remove("is-panning");
        panningRef.current = false;
        if (moved) setHoverId(null);
        if (tapCandidate && !moved) onSelectRef.current(tapId);
        tapCandidate = false;
      });

    zoomRef.current = behavior;
    select(svg).call(behavior as never);
    return () => {
      select(svg).on(".zoom", null);
      select(svg).interrupt();
      zoomRef.current = null;
    };
  }, [size.h, size.w]);

  useImperativeHandle(ref, () => ({
    zoomTo(id: string) {
      const svg = svgRef.current;
      const behavior = zoomRef.current;
      const path = pathRef.current;
      const feature = MAP_FEATURES.find((item) => item.id === id)?.feature;
      if (!svg || !behavior || !path || !feature) return;
      const [[x0, y0], [x1, y1]] = path.bounds(feature);
      const dx = x1 - x0;
      const dy = y1 - y0;
      if (dx < 1 || dy < 1) return;
      const { w, h } = sizeRef.current;
      const scale = Math.max(1, Math.min(8, 0.62 / Math.max(dx / w, dy / h)));
      const next = zoomIdentity
        .translate(w / 2, h / 2)
        .scale(scale)
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
      runZoom(svg, (selection) => behavior.transform(selection, next));
    },
    zoomBy(factor: number) {
      const svg = svgRef.current;
      const behavior = zoomRef.current;
      if (!svg || !behavior) return;
      runZoom(svg, (selection) => behavior.scaleBy(selection, factor));
    },
    reset() {
      const svg = svgRef.current;
      const behavior = zoomRef.current;
      if (!svg || !behavior) return;
      runZoom(svg, (selection) => behavior.transform(selection, zoomIdentity));
    },
  }));

  const hovered = hoverId ? COUNTRY_MAP.get(hoverId) : undefined;
  const hoverName =
    hovered?.name ?? drawn?.countries.find((country) => country.id === hoverId)?.name;
  const hoverValue = hovered ? hovered[summary.metric.id] : null;
  const hoverRank = hoverId ? summary.rankOf.get(hoverId) : undefined;
  const hoverOutline = drawn?.countries.find((country) => country.id === hoverId);
  const selectedOutline = drawn?.countries.find((country) => country.id === selectedId);

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full"
      onPointerLeave={() => setHoverId(null)}
    >
      <svg
        ref={svgRef}
        className="map-surface h-full w-full"
        role="application"
        aria-label="World map. Drag to pan, scroll or pinch to zoom, tap a country for details."
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" || panningRef.current) return;
          const target = event.target as Element | null;
          const id = target?.getAttribute?.("data-id") ?? null;
          if (!id) {
            setHoverId(null);
            return;
          }
          if (wrapRef.current) placeTip(wrapRef.current, event.clientX, event.clientY);
          setHoverId((prev) => (prev === id ? prev : id));
        }}
      >
        <g ref={gRef}>
          {drawn ? (
            <>
              <path
                d={drawn.sphere}
                fill="var(--color-ocean)"
                stroke="var(--color-line)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={drawn.graticule}
                fill="none"
                stroke="var(--color-line)"
                strokeOpacity={0.85}
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
              {drawn.countries.map((country) => {
                const record = COUNTRY_MAP.get(country.id);
                const value = record ? record[summary.metric.id] : null;
                return (
                  <path
                    key={country.id}
                    data-id={country.id}
                    d={country.d}
                    style={{ fill: colorForValue(value, summary) }}
                    className={
                      hoverId === country.id ? "country-shape is-hot" : "country-shape"
                    }
                  />
                );
              })}
              {hoverOutline && hoverId !== selectedId ? (
                <path
                  d={hoverOutline.d}
                  fill="none"
                  stroke="var(--color-foam)"
                  strokeWidth={1.6}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              ) : null}
              {selectedOutline ? (
                <path
                  d={selectedOutline.d}
                  fill="none"
                  stroke="var(--color-ochre)"
                  strokeWidth={2.25}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              ) : null}
            </>
          ) : null}
        </g>
      </svg>
      <div
        className={
          hoverId
            ? "tip pointer-events-none absolute z-20 w-56 rounded-card border border-line bg-surface/95 px-3 py-2.5 shadow-lg"
            : "tip pointer-events-none absolute z-20 hidden"
        }
      >
        {hoverName ? (
          <>
            <p className="truncate font-display text-lg leading-tight text-fg">{hoverName}</p>
            <p className="mt-1 text-sm text-fg">
              {hoverValue == null ? "No figure" : summary.metric.format(hoverValue)}
            </p>
            <p className="text-xs text-muted">
              {hoverRank
                ? `Rank ${hoverRank} of ${summary.count} · ${summary.metric.short}`
                : summary.metric.label}
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
});
