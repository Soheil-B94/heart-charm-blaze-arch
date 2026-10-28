declare module "d3-geo" {
  export interface GeoProjection {
    fitExtent(
      extent: [[number, number], [number, number]],
      object: unknown,
    ): GeoProjection;
  }
  export interface GeoPath {
    (object: unknown): string | null | undefined;
    bounds(object: unknown): [[number, number], [number, number]];
  }
  export interface GeoGraticule {
    (): unknown;
    step(step: [number, number]): GeoGraticule;
  }
  export function geoNaturalEarth1(): GeoProjection;
  export function geoPath(projection?: GeoProjection): GeoPath;
  export function geoGraticule(): GeoGraticule;
}

declare module "d3-zoom" {
  export interface ZoomTransform {
    k: number;
    x: number;
    y: number;
    toString(): string;
    translate(x: number, y: number): ZoomTransform;
    scale(k: number): ZoomTransform;
  }
  export interface ZoomEvent {
    transform: ZoomTransform;
    sourceEvent: Event | null;
  }
  export interface ZoomBehavior {
    (selection: unknown): void;
    scaleExtent(extent: [number, number]): ZoomBehavior;
    translateExtent(
      extent: [[number, number], [number, number]],
    ): ZoomBehavior;
    extent(extent: [[number, number], [number, number]]): ZoomBehavior;
    on(typenames: string, listener: (event: ZoomEvent) => void): ZoomBehavior;
    transform(selection: unknown, transform: ZoomTransform): void;
    scaleBy(selection: unknown, k: number): void;
  }
  export function zoom(): ZoomBehavior;
  export const zoomIdentity: ZoomTransform;
}

declare module "d3-selection" {
  export interface SelectionLike {
    attr(name: string, value: string | number | null): SelectionLike;
    call(fn: (...args: never[]) => void, ...args: unknown[]): SelectionLike;
    transition(): SelectionLike;
    duration(ms: number): SelectionLike;
    on(typenames: string, listener: null): SelectionLike;
    interrupt(): SelectionLike;
  }
  export function select(element: Element | null): SelectionLike;
}

declare module "d3-transition";

declare module "topojson-client" {
  export function feature(
    topology: unknown,
    object: unknown,
  ): {
    features: Array<{
      id?: string | number;
      properties?: { name?: string };
      type: string;
    }>;
  };
}

declare module "world-atlas/countries-110m.json" {
  const data: {
    objects: { countries: unknown };
  };
  export default data;
}
