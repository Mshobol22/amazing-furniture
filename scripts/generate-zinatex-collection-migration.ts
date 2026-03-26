import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

type CsvRow = Record<string, string>;

type MappingRow = {
  csvSku: string;
  category: string;
  designCode: string | null;
};

const CSV_PATH = "C:/Users/mshob/OneDrive/csv for AHF/zinat datasheet.csv";
const MIGRATIONS_DIR = path.resolve("supabase/migrations");

const CATEGORY_HEADER_CANDIDATES = ["CATEGORY", "Category", "Type", "Rug Type"];
const SKU_HEADER_CANDIDATES = ["Variation SKU", "SKU", "Design Number", "Parent SKU"];
const DESIGN_FALLBACK_HEADERS = ["Variation SKU", "Parent SKU", "TITLE", "SKU"];

function normalize(text: string | undefined | null): string {
  return (text ?? "").trim();
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function extractDesignCode(raw: string): string | null {
  const sku = normalize(raw);
  if (!sku) return null;

  const standaloneMatch = sku.match(/(\d+)(?=-standalone\b)/i);
  if (standaloneMatch?.[1]) return standaloneMatch[1];

  const startsWithNumber = sku.match(/^(\d+)/);
  if (startsWithNumber?.[1]) return startsWithNumber[1];

  const middleNumber = sku.match(/-(\d{3,})-/);
  if (middleNumber?.[1]) return middleNumber[1];

  const allNumeric = sku.match(/\d+/g);
  if (!allNumeric || allNumeric.length === 0) return null;
  const longToken = allNumeric.find((n) => n.length >= 3);
  return longToken ?? null;
}

function pickHeader(headers: string[], candidates: string[]): string {
  for (const candidate of candidates) {
    if (headers.includes(candidate)) return candidate;
  }
  throw new Error(`Missing expected header. Candidates: ${candidates.join(", ")}`);
}

function buildTimestamp(): string {
  const d = new Date();
  const parts = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ];
  return parts.join("");
}

function main() {
  const csvRaw = fs.readFileSync(CSV_PATH, "utf8");
  const records = parse(csvRaw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as CsvRow[];

  if (records.length === 0) {
    throw new Error("CSV is empty.");
  }

  const headers = Object.keys(records[0] ?? {});
  const categoryHeader = pickHeader(headers, CATEGORY_HEADER_CANDIDATES);
  const skuHeader = pickHeader(headers, SKU_HEADER_CANDIDATES);

  const mappings: MappingRow[] = [];
  const exactSeen = new Set<string>();

  for (const row of records) {
    const category = normalize(row[categoryHeader]);
    if (!category) continue;

    const csvSku = normalize(row[skuHeader]);
    const designSource =
      DESIGN_FALLBACK_HEADERS.map((h) => normalize(row[h])).find(Boolean) ?? csvSku;
    const designCode = extractDesignCode(designSource);

    if (csvSku) {
      const key = `${csvSku.toLowerCase()}|${category.toLowerCase()}`;
      if (!exactSeen.has(key)) {
        mappings.push({ csvSku, category, designCode });
        exactSeen.add(key);
      }
    } else if (designCode) {
      mappings.push({ csvSku: "", category, designCode });
    }
  }

  const exactRows = mappings.filter((m) => m.csvSku.length > 0);
  const fallbackRows = Array.from(
    new Map(
      mappings
        .filter((m) => m.designCode)
        .map((m) => [`${m.designCode!.toLowerCase()}|${m.category.toLowerCase()}`, m])
    ).values()
  );

  const exactValuesSql = exactRows
    .map(
      (m) =>
        `('${escapeSqlLiteral(m.csvSku)}', '${escapeSqlLiteral(m.category)}', ${
          m.designCode ? `'${escapeSqlLiteral(m.designCode)}'` : "NULL"
        })`
    )
    .join(",\n    ");

  const fallbackValuesSql = fallbackRows
    .map(
      (m) =>
        `(NULL, '${escapeSqlLiteral(m.category)}', '${escapeSqlLiteral(m.designCode as string)}')`
    )
    .join(",\n    ");

  const timestamp = buildTimestamp();
  const filename = `${timestamp}_zinatex_collection_from_csv.sql`;
  const targetPath = path.join(MIGRATIONS_DIR, filename);

  const sql = `-- Generated from ${CSV_PATH}
-- Category header: ${categoryHeader}
-- SKU header: ${skuHeader}
-- Matches by exact SKU first, then numeric design-code fallback.

WITH mapping(csv_sku, rug_category, design_code) AS (
  VALUES
    ${exactValuesSql}${fallbackValuesSql ? `,\n    ${fallbackValuesSql}` : ""}
),
exact_matches AS (
  SELECT m.csv_sku, m.rug_category
  FROM mapping m
  WHERE m.csv_sku IS NOT NULL AND TRIM(m.csv_sku) <> ''
),
fallback_matches AS (
  SELECT DISTINCT ON (p.id)
    p.id,
    m.rug_category
  FROM products p
  JOIN mapping m
    ON m.design_code IS NOT NULL
   AND p.sku ILIKE '%' || m.design_code || '%'
  WHERE p.manufacturer = 'Zinatex'
    AND NOT EXISTS (
      SELECT 1
      FROM exact_matches em
      WHERE LOWER(TRIM(em.csv_sku)) = LOWER(TRIM(p.sku))
    )
)
UPDATE products p
SET collection = em.rug_category
FROM exact_matches em
WHERE p.manufacturer = 'Zinatex'
  AND LOWER(TRIM(p.sku)) = LOWER(TRIM(em.csv_sku));

WITH mapping(csv_sku, rug_category, design_code) AS (
  VALUES
    ${exactValuesSql}${fallbackValuesSql ? `,\n    ${fallbackValuesSql}` : ""}
),
exact_matches AS (
  SELECT m.csv_sku, m.rug_category
  FROM mapping m
  WHERE m.csv_sku IS NOT NULL AND TRIM(m.csv_sku) <> ''
),
fallback_matches AS (
  SELECT DISTINCT ON (p.id)
    p.id,
    m.rug_category
  FROM products p
  JOIN mapping m
    ON m.design_code IS NOT NULL
   AND p.sku ILIKE '%' || m.design_code || '%'
  WHERE p.manufacturer = 'Zinatex'
    AND NOT EXISTS (
      SELECT 1
      FROM exact_matches em
      WHERE LOWER(TRIM(em.csv_sku)) = LOWER(TRIM(p.sku))
    )
)
UPDATE products p
SET collection = fm.rug_category
FROM fallback_matches fm
WHERE p.id = fm.id;
`;

  fs.writeFileSync(targetPath, sql, "utf8");

  console.log(`Generated migration: ${targetPath}`);
  console.log(`Rows parsed: ${records.length}`);
  console.log(`Exact mapping rows: ${exactRows.length}`);
  console.log(`Fallback mapping rows: ${fallbackRows.length}`);
}

main();
