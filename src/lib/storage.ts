import type { GithubRepoInfo, ExtractionOptions } from "./github";

export interface AnalysisRecord {
  id: string;
  owner: string;
  repo: string;
  timestamp: string;
  extractedData: Partial<GithubRepoInfo>;
  analysisMarkdown: string;
  options: ExtractionOptions;
  model: string;
}

const STORAGE_KEY = "gh_api_analysis_history";

export function loadHistory(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load history from localStorage", e);
    return [];
  }
}

export function saveHistory(records: AnalysisRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save history to localStorage", e);
  }
}

export function addRecord(record: AnalysisRecord): void {
  const history = loadHistory();
  const updated = [record, ...history.filter(r => r.id !== record.id)];
  saveHistory(updated);
}

export function deleteRecord(id: string): void {
  const history = loadHistory();
  const updated = history.filter(r => r.id !== id);
  saveHistory(updated);
}

export function formatDateString(date: Date): string {

  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}-${m}-${d}_${h}-${min}-${s}`;
}
