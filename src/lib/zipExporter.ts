import JSZip from "jszip";
import type { AnalysisRecord } from "./storage";

export async function exportAnalysisToZip(record: AnalysisRecord): Promise<void> {
  const zip = new JSZip();


  zip.file("analysis.md", record.analysisMarkdown);


  zip.file("extracted_data.json", JSON.stringify(record.extractedData, null, 2));


  if (record.extractedData.readme) {
    zip.file("repository_README.md", record.extractedData.readme);
  }


  const metadata = {
    owner: record.owner,
    repo: record.repo,
    timestamp: record.timestamp,
    model: record.model,
    options: record.options,
  };
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));


  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${record.id}.zip`;
  document.body.appendChild(link);
  link.click();
  

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
