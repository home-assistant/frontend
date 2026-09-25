import { fileDownload } from "./file_download";

export function csvSafeString(s: string | undefined): string {
  if (!s) return "";
  return /,|"/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvDownload(data: string[][], filename: string) {
  const csv = data.map((row) => row.join(",").concat("\n"));
  const blob = new Blob(csv, {
    type: "text/csv",
  });
  const url = window.URL.createObjectURL(blob);
  fileDownload(url, filename);
}
