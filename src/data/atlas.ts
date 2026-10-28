export type MetricId = "life" | "gdp" | "pop" | "net" | "renew" | "urban";
export type ScaleKind = "linear" | "log";

export type Country = {
  id: string;
  name: string;
  region: string | null;
  life: number | null;
  gdp: number | null;
  pop: number | null;
  net: number | null;
  renew: number | null;
  urban: number | null;
};

export type Metric = {
  id: MetricId;
  label: string;
  short: string;
  blurb: string;
  scale: ScaleKind;
  format: (value: number) => string;
  compact: (value: number) => string;
  delta: (value: number) => string;
  legend: (value: number) => string;
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function trimNum(n: number, digits: number): string {
  return n
    .toFixed(digits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

export function compactCount(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1e9) return `${sign}${trimNum(abs / 1e9, 2)}B`;
  if (abs >= 1e8) return `${sign}${trimNum(abs / 1e6, 0)}M`;
  if (abs >= 1e7) return `${sign}${trimNum(abs / 1e6, 1)}M`;
  if (abs >= 1e6) return `${sign}${trimNum(abs / 1e6, 2)}M`;
  if (abs >= 1e5) return `${sign}${trimNum(abs / 1e3, 0)}k`;
  if (abs >= 1e4) return `${sign}${trimNum(abs / 1e3, 1)}k`;
  return sign + grouped.format(Math.round(abs));
}

function percent(n: number): string {
  const digits = Math.abs(n - Math.round(n)) < 0.05 ? 0 : 1;
  return `${n.toFixed(digits)}%`;
}

export const METRICS: Metric[] = [
  {
    id: "life",
    label: "Life expectancy",
    short: "Life",
    blurb: "Years a newborn is expected to live.",
    scale: "linear",
    format: (n) => `${n.toFixed(1)} years`,
    compact: (n) => n.toFixed(1),
    delta: (n) => `${n.toFixed(1)} years`,
    legend: (n) => `${n.toFixed(0)} yrs`,
  },
  {
    id: "gdp",
    label: "GDP per person",
    short: "GDP",
    blurb: "Economic output per person, in current US dollars.",
    scale: "log",
    format: (n) => usd.format(n),
    compact: (n) => `$${compactCount(n)}`,
    delta: (n) => usd.format(n),
    legend: (n) => `$${compactCount(n)}`,
  },
  {
    id: "pop",
    label: "Population",
    short: "People",
    blurb: "People living in each country.",
    scale: "log",
    format: (n) => grouped.format(n),
    compact: (n) => compactCount(n),
    delta: (n) => compactCount(n),
    legend: (n) => compactCount(n),
  },
  {
    id: "net",
    label: "Internet access",
    short: "Internet",
    blurb: "Share of people who use the internet.",
    scale: "linear",
    format: percent,
    compact: percent,
    delta: (n) => `${n.toFixed(0)} points`,
    legend: percent,
  },
  {
    id: "renew",
    label: "Renewable power",
    short: "Renewables",
    blurb: "Share of electricity from renewable sources.",
    scale: "linear",
    format: percent,
    compact: percent,
    delta: (n) => `${n.toFixed(0)} points`,
    legend: percent,
  },
  {
    id: "urban",
    label: "Urban population",
    short: "Urban",
    blurb: "Share of people living in towns and cities.",
    scale: "linear",
    format: percent,
    compact: percent,
    delta: (n) => `${n.toFixed(0)} points`,
    legend: percent,
  },
];

const METRIC_BY_ID = new Map(METRICS.map((metric) => [metric.id, metric]));

export function metricById(id: MetricId): Metric {
  const metric = METRIC_BY_ID.get(id);
  if (!metric) throw new Error(`Unknown metric ${id}`);
  return metric;
}

const REGION: Record<string, string> = {
  af: "Africa",
  am: "Americas",
  as: "Asia",
  eu: "Europe",
  oc: "Oceania",
};

// id|region|life|gdp|pop|net|renew|urban|name
// Rounded sample figures, roughly 2023, for exploration only.
const RAW = `
242|oc|67.1|5300|930000|68|55|58|Fiji
834|af|66.8|1220|65400000|32|38|37|Tanzania
732|af|70.2|2500|576000|20|5|82|Western Sahara
124|am|82.2|53500|40000000|93|68|82|Canada
840|am|77.5|81600|334000000|92|22|83|United States
398|as|73.2|13100|19600000|92|12|58|Kazakhstan
860|as|71.7|2500|35600000|77|12|50|Uzbekistan
598|oc|65.3|2800|10200000|27|35|13|Papua New Guinea
360|as|71.2|4900|277500000|69|18|58|Indonesia
032|am|76.1|13700|46000000|88|31|92|Argentina
152|am|79.5|17000|19600000|90|55|88|Chile
180|af|59.2|650|102300000|23|96|46|DR Congo
706|af|55.6|500|17500000|10|8|47|Somalia
404|af|63.4|2100|55100000|32|90|29|Kenya
729|af|65.3|800|48100000|29|55|36|Sudan
148|af|52.9|720|18200000|12|4|24|Chad
332|am|64.1|1700|11580000|39|15|58|Haiti
214|am|74.2|10700|11330000|85|16|83|Dominican Republic
643|eu|73.2|13800|144400000|88|19|75|Russia
044|am|74.0|31500|410000|94|1|83|Bahamas
238|am|79.5|55000|3500|95|15|78|Falkland Islands
578|eu|83.0|106000|5500000|98|98|83|Norway
304|am|71.5|54000|56800|70|72|87|Greenland
260||||||||French Southern Lands
626|as|69.5|1500|1360000|39|12|32|Timor-Leste
710|af|64.1|6200|60400000|75|12|68|South Africa
426|af|54.1|1100|2300000|48|99|30|Lesotho
484|am|75.1|13800|128500000|76|24|81|Mexico
858|am|78.0|20800|3400000|90|91|96|Uruguay
076|am|75.4|10400|216400000|84|89|87|Brazil
068|am|68.0|3700|12300000|66|30|71|Bolivia
604|am|76.5|7600|34300000|75|58|79|Peru
170|am|76.8|6900|52080000|73|72|82|Colombia
591|am|78.5|18600|4400000|73|70|69|Panama
188|am|77.3|16500|5200000|85|99|82|Costa Rica
558|am|74.6|2300|7000000|57|50|60|Nicaragua
340|am|73.0|3200|10590000|48|48|60|Honduras
222|am|73.3|5300|6330000|63|55|74|El Salvador
320|am|72.0|5400|17600000|54|60|53|Guatemala
084|am|73.5|7000|410000|62|50|46|Belize
862|am|72.0|4500|28800000|72|68|88|Venezuela
328|am|69.8|18400|810000|70|20|27|Guyana
740|am|72.5|5900|620000|66|48|66|Suriname
250|eu|82.4|44600|68000000|86|26|81|France
218|am|77.0|6500|18000000|70|78|64|Ecuador
630|am|80.0|37200|3220000|88|6|94|Puerto Rico
388|am|74.2|6700|2830000|82|12|57|Jamaica
192|am|78.2|6500|11190000|71|5|77|Cuba
716|af|61.0|2000|16670000|35|55|32|Zimbabwe
072|af|65.2|7300|2630000|73|2|72|Botswana
516|af|63.4|4900|2600000|53|68|54|Namibia
686|af|67.9|1700|17760000|58|22|49|Senegal
466|af|59.3|900|22600000|33|28|45|Mali
478|af|64.7|2100|4900000|40|20|57|Mauritania
204|af|61.2|1400|13710000|34|4|50|Benin
562|af|61.6|630|27200000|16|5|17|Niger
566|af|53.6|1600|223800000|36|22|54|Nigeria
120|af|62.4|1700|28650000|46|62|59|Cameroon
768|af|62.0|1000|9050000|35|68|44|Togo
288|af|64.1|2300|34120000|70|42|58|Ghana
384|af|60.0|2600|28800000|45|32|53|Côte d'Ivoire
324|af|60.0|1500|14190000|27|68|38|Guinea
624|af|60.0|900|2150000|35|15|45|Guinea-Bissau
430|af|61.0|750|5410000|22|55|53|Liberia
694|af|60.1|530|8790000|18|65|44|Sierra Leone
854|af|60.0|850|23250000|22|14|32|Burkina Faso
140|af|53.9|500|5740000|11|88|43|Central African Republic
178|af|64.0|2400|6100000|36|48|69|Congo
266|af|66.5|8600|2430000|72|42|90|Gabon
226|af|62.3|7200|1710000|60|25|74|Equatorial Guinea
894|af|62.4|1400|20570000|31|88|46|Zambia
454|af|63.0|640|20930000|18|78|18|Malawi
508|af|60.9|580|33890000|21|82|38|Mozambique
748|af|57.0|3900|1220000|58|38|25|Eswatini
024|af|62.0|2300|36680000|33|68|68|Angola
108|af|62.0|260|13240000|10|72|14|Burundi
376|as|82.6|52200|9800000|90|8|93|Israel
422|as|76.4|4100|5490000|82|5|89|Lebanon
450|af|66.0|530|30330000|20|45|40|Madagascar
275|as|74.5|3600|5300000|75|6|77|Palestine
270|af|63.0|850|2770000|54|5|64|Gambia
788|af|74.3|4300|12360000|72|6|70|Tunisia
012|af|76.4|5000|45610000|71|1|75|Algeria
400|as|74.5|4500|11340000|86|23|92|Jordan
784|as|79.2|51000|9510000|99|6|87|United Arab Emirates
634|as|79.3|82000|2710000|99|0|99|Qatar
414|as|78.5|37000|4310000|99|0|100|Kuwait
368|as|70.4|5900|45500000|60|4|71|Iraq
512|as|76.0|21000|4640000|95|2|87|Oman
548|oc|70.5|3200|335000|41|22|26|Vanuatu
116|as|70.0|1900|16940000|60|55|25|Cambodia
764|as|77.7|7200|71800000|85|15|53|Thailand
418|as|68.5|2100|7630000|46|78|37|Laos
104|as|67.0|1100|54580000|44|48|32|Myanmar
704|as|74.5|4300|98860000|78|42|39|Vietnam
408|as|73.0|700|26160000|0|52|63|North Korea
410|as|83.5|33100|51740000|97|8|81|South Korea
496|as|71.0|5600|3440000|81|8|69|Mongolia
356|as|72.0|2500|1428600000|52|21|36|India
050|as|73.0|2700|172900000|39|2|40|Bangladesh
064|as|72.0|3700|787000|86|99|44|Bhutan
524|as|70.5|1400|30890000|50|98|21|Nepal
586|as|66.5|1600|240500000|33|28|38|Pakistan
004|as|63.2|370|42240000|18|82|26|Afghanistan
762|as|71.0|1100|10140000|36|95|28|Tajikistan
417|as|71.5|1700|7000000|78|90|38|Kyrgyzstan
795|as|68.0|8200|6510000|25|0|53|Turkmenistan
364|as|75.0|4500|89170000|79|6|77|Iran
760|as|72.0|1100|23230000|47|5|57|Syria
051|as|75.0|8100|2780000|79|28|64|Armenia
752|eu|83.0|56300|10520000|96|68|88|Sweden
112|eu|74.0|7800|9200000|86|8|80|Belarus
804|eu|73.0|5200|37000000|82|14|70|Ukraine
616|eu|77.0|22100|37700000|87|21|60|Poland
040|eu|81.6|56800|9100000|93|80|59|Austria
348|eu|76.0|22100|9600000|89|18|72|Hungary
498|eu|71.0|6600|2500000|80|8|43|Moldova
642|eu|75.0|18400|19000000|84|45|54|Romania
440|eu|75.8|27100|2870000|88|75|68|Lithuania
428|eu|75.0|23100|1880000|91|70|68|Latvia
233|eu|78.0|29200|1370000|91|38|69|Estonia
276|eu|81.0|52700|84480000|92|52|78|Germany
100|eu|74.0|15800|6500000|80|22|76|Bulgaria
300|eu|81.0|22900|10400000|83|45|80|Greece
792|as|76.0|13000|85820000|83|42|77|Turkey
008|eu|78.0|8300|2810000|83|99|64|Albania
191|eu|77.6|21400|3860000|82|68|58|Croatia
756|eu|83.8|99500|8850000|96|72|74|Switzerland
442|eu|82.4|128400|660000|98|18|92|Luxembourg
056|eu|81.9|53000|11700000|94|28|98|Belgium
528|eu|81.8|62500|17800000|96|40|93|Netherlands
620|eu|81.6|27300|10470000|85|63|67|Portugal
724|eu|83.2|33500|48000000|94|50|81|Spain
372|eu|82.3|103500|5300000|95|40|64|Ireland
540|oc|78.0|35000|292000|82|20|72|New Caledonia
090|oc|70.0|2200|740000|36|28|26|Solomon Islands
554|oc|82.1|48500|5220000|95|87|87|New Zealand
036|oc|83.2|65000|26600000|96|35|86|Australia
144|as|76.6|3800|22180000|50|40|19|Sri Lanka
156|as|78.2|12600|1412000000|76|31|65|China
158|as|80.8|32600|23900000|90|8|79|Taiwan
380|eu|82.9|39000|58900000|85|42|72|Italy
208|eu|81.4|68000|5940000|98|81|88|Denmark
826|eu|80.7|49400|67800000|96|45|84|United Kingdom
352|eu|82.7|79000|387000|99|100|94|Iceland
031|as|72.0|7200|10410000|86|8|57|Azerbaijan
268|as|73.5|8100|3710000|80|78|60|Georgia
608|as|72.0|3900|117300000|70|24|48|Philippines
458|as|76.0|11900|34300000|97|18|78|Malaysia
096|as|75.5|33000|453000|98|0|79|Brunei
705|eu|81.3|32100|2110000|90|35|56|Slovenia
246|eu|81.9|54000|5560000|94|52|86|Finland
703|eu|77.0|24400|5430000|90|24|54|Slovakia
203|eu|79.0|30500|10880000|86|15|74|Czechia
232|af|66.5|650|3740000|8|5|43|Eritrea
392|as|84.1|33900|124000000|83|22|92|Japan
600|am|73.5|6200|6860000|77|100|63|Paraguay
887|as|64.0|700|34450000|27|12|39|Yemen
682|as|77.0|28800|36950000|99|1|85|Saudi Arabia
010||||||||Antarctica
n-cyprus|eu|78.5|15000|382000|75|8|67|Northern Cyprus
196|eu|81.2|34000|1260000|91|18|67|Cyprus
504|af|74.0|3900|37840000|88|20|65|Morocco
818|af|70.2|4300|112700000|72|12|43|Egypt
434|af|72.5|6700|6880000|46|0|81|Libya
231|af|66.0|1100|126500000|19|98|23|Ethiopia
262|af|65.0|3600|1130000|68|10|78|Djibouti
somaliland|af|58.0|800|5700000|12|8|50|Somaliland
800|af|64.0|1000|48580000|25|92|26|Uganda
646|af|67.0|1000|14090000|30|55|18|Rwanda
070|eu|77.0|8800|3230000|76|40|50|Bosnia and Herzegovina
807|eu|75.5|8100|1830000|84|24|59|North Macedonia
688|eu|75.5|11300|6730000|84|30|57|Serbia
499|eu|76.0|12000|626000|82|62|68|Montenegro
kosovo|eu|76.5|5900|1760000|90|5|45|Kosovo
780|am|73.5|18000|1530000|80|0|53|Trinidad and Tobago
728|af|56.0|400|11480000|8|8|21|South Sudan
`;

function parseCountry(line: string): Country | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//")) return null;
  const [id, region, life, gdp, pop, net, renew, urban, name] = trimmed.split("|");
  if (!id || !name || name === "SKIP") return null;
  const num = (value: string | undefined) => {
    if (!value || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    id,
    name,
    region: region ? (REGION[region] ?? null) : null,
    life: num(life),
    gdp: num(gdp),
    pop: num(pop),
    net: num(net),
    renew: num(renew),
    urban: num(urban),
  };
}

export const COUNTRIES: Country[] = RAW.split("\n")
  .map(parseCountry)
  .filter((country): country is Country => country !== null);

export const COUNTRY_MAP = new Map(COUNTRIES.map((country) => [country.id, country]));

export function displayName(id: string, fallback = "Unknown"): string {
  return COUNTRY_MAP.get(id)?.name ?? fallback;
}

const STOPS: Array<[number, [number, number, number]]> = [
  [0, [24, 78, 68]],
  [0.42, [86, 158, 128]],
  [0.72, [224, 176, 90]],
  [1, [246, 236, 214]],
];

export function colorAt(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  let index = 0;
  while (index < STOPS.length - 2 && x > STOPS[index + 1][0]) index += 1;
  const [t0, c0] = STOPS[index];
  const [t1, c1] = STOPS[index + 1];
  const span = t1 - t0 || 1;
  const u = (x - t0) / span;
  const rgb = c0.map((channel, i) => Math.round(channel + (c1[i] - channel) * u));
  return `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})`;
}

export function legendGradient(): string {
  const stops = STOPS.map(
    ([t, rgb]) => `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]}) ${(t * 100).toFixed(0)}%`,
  );
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function position(scale: ScaleKind, value: number, min: number, max: number): number {
  if (!(max > min)) return 0.5;
  if (scale === "log") {
    const safe = (n: number) => Math.log(Math.max(n, 1e-9));
    return (safe(value) - safe(min)) / (safe(max) - safe(min));
  }
  return (value - min) / (max - min);
}

export type Ranked = {
  id: string;
  name: string;
  region: string | null;
  value: number;
  rank: number;
};

export type Summary = {
  metric: Metric;
  rows: Ranked[];
  min: number;
  max: number;
  median: number;
  count: number;
  rankOf: Map<string, number>;
};

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarize(metricId: MetricId): Summary {
  const metric = metricById(metricId);
  const ranked = COUNTRIES.flatMap((country) => {
    const value = country[metricId];
    if (value == null) return [];
    return [{ id: country.id, name: country.name, region: country.region, value }];
  }).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

  const rows: Ranked[] = ranked.map((row, index) => ({ ...row, rank: index + 1 }));
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

export function colorForValue(value: number | null, summary: Summary): string {
  if (value == null || summary.count === 0) return "var(--color-nodata)";
  return colorAt(position(summary.metric.scale, value, summary.min, summary.max));
}

export function medianPhrase(metric: Metric, value: number, median: number): string {
  const delta = value - median;
  const relative = median === 0 ? Math.abs(delta) : Math.abs(delta / median);
  const close =
    metric.id === "life"
      ? Math.abs(delta) < 0.15
      : metric.id === "gdp" || metric.id === "pop"
        ? relative < 0.03
        : Math.abs(delta) < 0.5;
  if (close) return "In line with the median";
  const direction = delta > 0 ? "above" : "below";
  return `${metric.delta(Math.abs(delta))} ${direction} the median`;
}
