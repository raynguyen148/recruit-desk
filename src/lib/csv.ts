import Papa from "papaparse";

/** Spreadsheet apps run cells that start with these characters as formulas. */
const guard = (value: string) =>
  /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

export function toCSV(rows: Record<string, string | number>[]): string {
  return Papa.unparse(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, guard(String(value))]),
      ),
    ),
    { newline: "\r\n" },
  );
}

export function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
