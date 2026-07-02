import JSZip from "jszip";
import type { AnalysisRecord } from "./storage";

export async function exportAnalysisToZip(record: AnalysisRecord): Promise<void> {
  const zip = new JSZip();

  // 1. Add AI analysis markdown
  zip.file("analysis.md", record.analysisMarkdown);

  // 2. Add raw data
  zip.file("extracted_data.json", JSON.stringify(record.extractedData, null, 2));

  // 3. Add README if available
  if (record.extractedData.readme) {
    zip.file("repository_README.md", record.extractedData.readme);
  }

  // 4. Add metadata file
  const metadata = {
    owner: record.owner,
    repo: record.repo,
    timestamp: record.timestamp,
    model: record.model,
    options: record.options,
  };
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  // 5. Generate and download zip
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${record.id}.zip`;
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
