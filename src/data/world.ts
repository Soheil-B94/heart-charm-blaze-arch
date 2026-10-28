import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

export type MapFeature = {
  id: string;
  name: string;
  feature: unknown;
};

function featureId(rawId: string | number | undefined, geoName: string): string {
  if (rawId != null && String(rawId) !== "undefined") return String(rawId);
  if (geoName === "N. Cyprus") return "n-cyprus";
  if (geoName === "Somaliland") return "somaliland";
  if (geoName === "Kosovo") return "kosovo";
  return `x:${geoName}`;
}

const collection = feature(world, world.objects.countries);

export const MAP_FEATURES: MapFeature[] = collection.features.map((item) => {
  const geoName = item.properties?.name ?? "Unknown";
  return {
    id: featureId(item.id, geoName),
    name: geoName,
    feature: item,
  };
});
