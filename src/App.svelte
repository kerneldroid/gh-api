<script lang="ts">
  import { onMount } from "svelte";
  import { 
    Card, 
    Icon, 
    LoadingIndicator,
    NavCMLX,
    NavCMLXItem,
    NavigationRail,
    NavigationRailItem,
    TextField,
    Button,
    Divider
  } from "m3-svelte";


  import iconSearch from "@ktibow/iconset-material-symbols/search";
  import iconHistory from "@ktibow/iconset-material-symbols/history";
  import iconSettings from "@ktibow/iconset-material-symbols/settings";
  import iconAnalytics from "@ktibow/iconset-material-symbols/monitoring";
  import iconDownload from "@ktibow/iconset-material-symbols/download";
  import iconError from "@ktibow/iconset-material-symbols/error";
  import iconInfo from "@ktibow/iconset-material-symbols/info";
  import iconSecurity from "@ktibow/iconset-material-symbols/security";


  import { applyDefaultTheme, applyThemeFromAvatar } from "./lib/theme";
  import { fetchGithubData, parseRepoString, defaultOptions } from "./lib/github";
  import type { GithubRepoInfo, ExtractionOptions } from "./lib/github";
  import { analyzeWithGemini } from "./lib/gemini";
  import { loadHistory, addRecord, deleteRecord, formatDateString } from "./lib/storage";
  import type { AnalysisRecord } from "./lib/storage";
  import { exportAnalysisToZip } from "./lib/zipExporter";
  import { toastState } from "./lib/toast.svelte";


  import Settings from "./lib/components/Settings.svelte";
  import RepositoryData from "./lib/components/RepositoryData.svelte";
  import HistoryView from "./lib/components/HistoryView.svelte";
  import Toast from "./lib/components/Toast.svelte";


  let githubToken = $state("");
  let geminiKey = $state("");
  let selectedModel = $state("gemini-3.5-flash");
  let options = $state<ExtractionOptions>({ ...defaultOptions });

  let repoInput = $state("");
  let activeTab = $state(localStorage.getItem("gh_api_active_tab") || "search"); // search, results, history, settings
  let loading = $state(false);
  let statusMsg = $state("");
  let errorMsg = $state("");

  let currentRecord = $state<AnalysisRecord | null>(null);
  let historyRecords = $state<AnalysisRecord[]>([]);


  let showRawData = $state(false);

  function renderMarkdown(md: string): string {
    if (!md) return "";

    function escapeHtml(text: string): string {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function parseInline(text: string): string {
      let result = escapeHtml(text);
      
      result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
      
      result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
      result = result.replace(/_(.*?)_/g, '<em>$1</em>');
      
      result = result.replace(/`(.*?)`/g, '<code>$1</code>');
      
      result = result.replace(/\[(.*?)\]\((.*?)\)/g, (_match: string, text: string, url: string) => {
        const trimmedUrl = url.trim().toLowerCase();
        if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('mailto:')) {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        return text;
      });
      
      return result;
    }

    const lines = md.split(/\r?\n/);
    let html = "";
    
    let inCodeBlock = false;
    let codeBlockLang = "";
    let codeBlockLines: string[] = [];
    
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];
    
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    
    let inBlockquote = false;
    let blockquoteLines: string[] = [];
    
    function closeCurrentBlocks() {
      if (inCodeBlock) {
        html += `<pre class="code-block language-${codeBlockLang}"><code>${escapeHtml(codeBlockLines.join("\n"))}</code></pre>`;
        codeBlockLines = [];
        inCodeBlock = false;
      }
      if (inTable) {
        if (tableHeaders.length > 0 || tableRows.length > 0) {
          html += '<div class="table-container"><table>';
          if (tableHeaders.length > 0) {
            html += '<thead><tr>';
            tableHeaders.forEach(h => {
              html += `<th>${parseInline(h)}</th>`;
            });
            html += '</tr></thead>';
          }
          if (tableRows.length > 0) {
            html += '<tbody>';
            tableRows.forEach(row => {
              html += '<tr>';
              row.forEach(cell => {
                html += `<td>${parseInline(cell)}</td>`;
              });
              html += '</tr>';
            });
            html += '</tbody>';
          }
          html += '</table></div>';
        }
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      }
      if (inList) {
        html += listType === 'ol' ? '</ol>' : '</ul>';
        inList = false;
        listType = null;
      }
      if (inBlockquote) {
        const content = blockquoteLines.join("\n");
        const trimmed = content.trim();
        
        const isSecurityWarning = 
          trimmed.startsWith('[!WARNING]') || 
          trimmed.startsWith('[!CAUTION]') ||
          trimmed.startsWith('[!SECURITY]') ||
          /⚠️|leak|утечк|warning|danger|критическ|опасн|внимание/i.test(trimmed);
          
        let displayContent = content;
        if (trimmed.startsWith('[!WARNING]') || trimmed.startsWith('[!CAUTION]') || trimmed.startsWith('[!SECURITY]')) {
          displayContent = content.replace(/^\[!(WARNING|CAUTION|SECURITY)\]/i, '').trim();
        } else if (trimmed.startsWith('[!NOTE]') || trimmed.startsWith('[!IMPORTANT]') || trimmed.startsWith('[!TIP]')) {
          displayContent = content.replace(/^\[!(NOTE|IMPORTANT|TIP)\]/i, '').trim();
        }

        const linesParsed = displayContent.split("\n").map(l => parseInline(l)).join("<br>");

        if (isSecurityWarning) {
          html += `<div class="callout callout-warning">
            <div class="callout-icon">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <div class="callout-content">${linesParsed}</div>
          </div>`;
        } else {
          html += `<blockquote>${linesParsed}</blockquote>`;
        }
        
        blockquoteLines = [];
        inBlockquote = false;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (inCodeBlock) {
        if (trimmed.startsWith("```")) {
          closeCurrentBlocks();
        } else {
          codeBlockLines.push(line);
        }
        continue;
      }

      if (trimmed.startsWith("```")) {
        closeCurrentBlocks();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        continue;
      }

      if (line.startsWith(">")) {
        if (!inBlockquote) {
          closeCurrentBlocks();
          inBlockquote = true;
        }
        const content = line.substring(1).replace(/^\s/, '');
        blockquoteLines.push(content);
        continue;
      } else if (inBlockquote && trimmed !== "") {
        const content = line.replace(/^\s/, '');
        blockquoteLines.push(content);
        continue;
      } else if (inBlockquote && trimmed === "") {
        closeCurrentBlocks();
      }

      if (trimmed.startsWith("#")) {
        closeCurrentBlocks();
        const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const text = match[2];
          html += `<h${level}>${parseInline(text)}</h${level}>`;
          continue;
        }
      }

      if (trimmed.startsWith("|")) {
        const isSeparator = /^\|[\s\-\|:]+\|$/.test(trimmed);
        if (isSeparator) {
          continue;
        }

        const cells = trimmed
          .split("|")
          .map(c => c.trim())
          .slice(1, -1);

        if (!inTable) {
          closeCurrentBlocks();
          inTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable && trimmed === "") {
        closeCurrentBlocks();
        continue;
      }

      const ulMatch = trimmed.match(/^[\*\-\+]\s+(.*)$/);
      const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          closeCurrentBlocks();
          inList = true;
          listType = 'ul';
          html += '<ul>';
        }
        html += `<li>${parseInline(ulMatch[1])}</li>`;
        continue;
      } else if (olMatch) {
        if (!inList || listType !== 'ol') {
          closeCurrentBlocks();
          inList = true;
          listType = 'ol';
          html += '<ol>';
        }
        html += `<li>${parseInline(olMatch[2])}</li>`;
        continue;
      } else if (inList && trimmed === "") {
        closeCurrentBlocks();
        continue;
      }

      if (trimmed === "") {
        closeCurrentBlocks();
      } else {
        closeCurrentBlocks();
        html += `<p>${parseInline(line)}</p>`;
      }
    }

    closeCurrentBlocks();
    return html;
  }


  onMount(() => {
    applyDefaultTheme();

    githubToken = localStorage.getItem("gh_api_github_token") || "";
    geminiKey = localStorage.getItem("gh_api_gemini_key") || "";
    selectedModel = localStorage.getItem("gh_api_gemini_model") || "gemini-3.5-flash";

    const savedOptions = localStorage.getItem("gh_api_options");
    if (savedOptions) {
      try {
        options = JSON.parse(savedOptions);
      } catch (e) {
        console.error(e);
      }
    }

    historyRecords = loadHistory();


    const lastRecordId = localStorage.getItem("gh_api_current_record_id");
    if (lastRecordId) {
      const match = historyRecords.find(r => r.id === lastRecordId);
      if (match) {
        currentRecord = match;
      }
    }
  });


  $effect(() => {
    localStorage.setItem("gh_api_options", JSON.stringify(options));
  });


  $effect(() => {
    localStorage.setItem("gh_api_active_tab", activeTab);
  });


  $effect(() => {
    if (currentRecord) {
      localStorage.setItem("gh_api_current_record_id", currentRecord.id);
    } else {
      localStorage.removeItem("gh_api_current_record_id");
    }
  });

  async function handleAnalysis() {
    const repoInfo = parseRepoString(repoInput);
    if (!repoInfo) {
      toastState.show("Please enter a valid owner/repo string or GitHub URL", "error");
      return;
    }

    if (!githubToken.trim()) {
      toastState.show("GitHub Token is required to proceed (limits bypass).", "error");
      activeTab = "settings";
      return;
    }

    if (!geminiKey.trim()) {
      toastState.show("Gemini API Key is required to run analysis.", "error");
      activeTab = "settings";
      return;
    }

    loading = true;
    errorMsg = "";
    statusMsg = "Initializing analysis pipeline...";
    currentRecord = null;
    showRawData = false;

    const { owner, repo } = repoInfo;

    try {
      const avatarUrl = `https://avatars.githubusercontent.com/${owner}`;
      applyThemeFromAvatar(avatarUrl).catch(err => {
        console.warn("Theme application failed. Using default theme.", err);
      });

      const extractedData = await fetchGithubData(
        owner,
        repo,
        githubToken.trim(),
        options,
        (progress) => {
          statusMsg = progress;
        }
      );

      statusMsg = "Generating AI Analysis with Gemini...";
      const analysisMarkdown = await analyzeWithGemini(
        owner,
        repo,
        extractedData,
        selectedModel,
        geminiKey.trim()
      );

      const timestamp = formatDateString(new Date());
      const record: AnalysisRecord = {
        id: `checkout-${owner}-${repo}-${timestamp}`,
        owner,
        repo,
        timestamp,
        extractedData,
        analysisMarkdown,
        options: { ...options },
        model: selectedModel,
      };

      addRecord(record);
      historyRecords = loadHistory();
      currentRecord = record;

      toastState.show("Analysis completed successfully!", "success");
      activeTab = "results";
    } catch (e: any) {
      console.error(e);
      errorMsg = e.message || "An unexpected error occurred during extraction/analysis.";
      toastState.show("Analysis failed.", "error");
    } finally {
      loading = false;
    }
  }

  function handleSelectRecord(record: AnalysisRecord) {
    currentRecord = record;
    showRawData = false;
    activeTab = "results";

    const avatarUrl = `https://avatars.githubusercontent.com/${record.owner}`;
    applyThemeFromAvatar(avatarUrl).catch(err => console.warn(err));
  }

  function handleDeleteRecord(id: string) {
    deleteRecord(id);
    historyRecords = loadHistory();
    if (currentRecord?.id === id) {
      currentRecord = null;
    }
    toastState.show("Record deleted.", "info");
  }

  function toggleRawData() {
    showRawData = !showRawData;
  }
</script>

<!-- Main Responsive Layout -->
<main class="app-layout" class:show-search={activeTab === "search"} class:show-results={activeTab === "results"} class:show-history={activeTab === "history"} class:show-settings={activeTab === "settings"}>
  
  <!-- Mobile Navigation Bar -->
  <div class="mobile-nav-container">
    <NavCMLX variant="compact">
      <NavCMLXItem 
        variant="compact" 
        icon={iconSearch} 
        text="Audit" 
        selected={activeTab === "search"} 
        onclick={() => activeTab = "search"} 
      />
      <NavCMLXItem 
        variant="compact" 
        icon={iconAnalytics} 
        text="Results" 
        selected={activeTab === "results"} 
        onclick={() => activeTab = "results"} 
      />
      <NavCMLXItem 
        variant="compact" 
        icon={iconHistory} 
        text="History" 
        selected={activeTab === "history"} 
        onclick={() => activeTab = "history"} 
      />
      <NavCMLXItem 
        variant="compact" 
        icon={iconSettings} 
        text="Settings" 
        selected={activeTab === "settings"} 
        onclick={() => activeTab = "settings"} 
      />
    </NavCMLX>
  </div>

  <!-- Sidebar for PC -->
  <div class="pc-sidebar">
    <NavigationRail collapse="no" alignment="top">
      <NavigationRailItem 
        label="Audit" 
        icon={iconSearch} 
        active={activeTab === "search"} 
        onclick={() => activeTab = "search"} 
      />
      <NavigationRailItem 
        label="Results" 
        icon={iconAnalytics} 
        active={activeTab === "results"} 
        onclick={() => activeTab = "results"} 
      />
      <NavigationRailItem 
        label="History" 
        icon={iconHistory} 
        active={activeTab === "history"} 
        onclick={() => activeTab = "history"} 
      />
      <NavigationRailItem 
        label="Settings" 
        icon={iconSettings} 
        active={activeTab === "settings"} 
        onclick={() => activeTab = "settings"} 
      />
    </NavigationRail>
  </div>

  <!-- Content Workspace -->
  <section class="content-workspace">
    {#if activeTab === "search"}
      <div class="tab-panel search-panel">
        <Card variant="outlined" class="search-form-card">
          <div class="panel-header">
            <h3>Start Repository Audit</h3>
            <p>Extract, review, and scan public or private github repositories for stats, details, and security issues.</p>
          </div>

          <div class="search-inputs">
            <TextField 
              label="Repository Name or URL" 
              bind:value={repoInput}
            />
            
            <div class="credentials-warning">
              {#if !githubToken.trim() || !geminiKey.trim()}
                <div class="warning-alert">
                  <Icon icon={iconInfo} size={20} />
                  <span>Please make sure you configured the **GitHub Token** & **Gemini Key** in settings to start auditing.</span>
                </div>
              {/if}
            </div>

            <Button 
              onclick={handleAnalysis} 
              disabled={loading || !repoInput.trim()} 
              class="run-btn"
            >
              Analyze Repo
            </Button>
          </div>
        </Card>

        {#if loading}
          <div class="loading-overlay">
            <LoadingIndicator size={48} aria-label="Loading repository audit" />
            <p>{statusMsg}</p>
          </div>
        {/if}

        {#if errorMsg}
          <div class="error-panel">
            <Card variant="filled">
              <div class="error-flex">
                <Icon icon={iconError} size={32} />
                <div class="error-text">
                  <h4>Audit Pipeline Failed</h4>
                  <p>{errorMsg}</p>
                </div>
              </div>
            </Card>
          </div>
        {/if}
      </div>

    {:else if activeTab === "results"}
      <div class="tab-panel results-panel">
        {#if !currentRecord}
          <div class="no-results">
            <Card variant="outlined">
              <div class="no-results-content">
                <Icon icon={iconAnalytics} size={48} />
                <h3>No active results</h3>
                <p>Run a new analysis in the Audit tab or pick one from the History tab.</p>
              </div>
            </Card>
          </div>
        {:else}
          <div class="results-header-card">
            <Card variant="filled">
              <div class="results-meta-row">
                <div class="results-title-group">
                  <h3>Analysis: {currentRecord.owner}/{currentRecord.repo}</h3>
                  <span class="timestamp-label">Date: {currentRecord.timestamp}</span>
                </div>
                <div class="actions-group">
                  <Button variant="filled" iconType="left" onclick={() => exportAnalysisToZip(currentRecord!)}>
                    <Icon icon={iconDownload} size={16} />
                    Export ZIP
                  </Button>
                  <Button variant="tonal" onclick={toggleRawData}>
                    {showRawData ? "View AI Summary" : "View Extracted Data"}
                  </Button>
                  <Button variant="outlined" onclick={() => currentRecord = null}>
                    Close
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div class="results-content-view">
            {#if showRawData}
              <RepositoryData data={currentRecord.extractedData} />
            {:else}
              <Card variant="outlined" class="markdown-report-card">
                <div class="report-header">
                  <Icon icon={iconSecurity} size={22} />
                  <h4>Gemini AI Security & Health Audit Report ({currentRecord.model})</h4>
                </div>
                <Divider />
                <div class="report-body">
                  {@html renderMarkdown(currentRecord.analysisMarkdown)}
                </div>
              </Card>
            {/if}
          </div>
        {/if}
      </div>

    {:else if activeTab === "history"}
      <div class="tab-panel history-panel">
        <div class="panel-header">
          <h3>Local Storage Cache History</h3>
          <p>Browse previously cached audits and download summaries offline.</p>
        </div>
        <HistoryView 
          records={historyRecords} 
          onselectRecord={handleSelectRecord} 
          ondeleteRecord={handleDeleteRecord} 
        />
      </div>

    {:else if activeTab === "settings"}
      <div class="tab-panel settings-panel">
        <div class="panel-header">
          <h3>Project Configuration</h3>
          <p>Modify API keys, model selections, and fine-tune parsing parameters.</p>
        </div>
        <Settings 
          bind:githubToken={githubToken} 
          bind:geminiKey={geminiKey} 
          bind:selectedModel={selectedModel} 
          bind:options={options} 
        />
      </div>
    {/if}
  </section>
</main>

<Toast />

<style>
  .app-layout {
    display: flex;
    flex-direction: row;
    min-height: 100vh;
    background-color: var(--m3c-surface);
    color: var(--m3c-on-surface);
  }

  .pc-sidebar {
    height: 100vh;
    z-index: 50;
    border-right: 1px solid var(--m3c-outline-variant);
    background-color: var(--m3c-surface-container);
    display: flex;
    flex-shrink: 0;
  }

  .mobile-nav-container {
    display: none;
  }

  .content-workspace {
    flex-grow: 1;
    padding: 2.5rem;
    overflow-y: auto;
    max-height: 100vh;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  .tab-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }

  .panel-header {
    margin-bottom: 0.5rem;
  }

  .panel-header h3 {
    margin: 0 0 0.25rem;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.4px;
  }

  .panel-header p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--m3c-on-surface-variant);
  }

  .search-form-card > :global(.m3-container) {
    padding: 2rem;
    border-radius: var(--m3-shape-large);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .search-inputs {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .search-inputs > :global(.m3-container) {
    padding: 0 !important;
  }

  .credentials-warning {
    min-height: 24px;
  }

  .warning-alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background-color: var(--m3c-error-container);
    color: var(--m3c-on-error-container);
    border: 1px solid var(--m3c-error);
    padding: 0.75rem 1rem;
    border-radius: var(--m3-shape-medium);
    font-size: 0.85rem;
  }

  :global(.run-btn) {
    align-self: flex-start;
    padding: 0 32px !important;
    height: 48px !important;
    border-radius: 24px !important;
    background-color: var(--m3c-primary) !important;
    color: var(--m3c-on-primary) !important;
    font-weight: 600 !important;
    border: none !important;
    cursor: pointer;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: border-radius 383ms cubic-bezier(0.2, 0.8, 0.2, 1), 
                background-color 0.2s ease, 
                box-shadow 0.2s ease !important;
  }

  :global(.run-btn:hover:not(:disabled)) {
    box-shadow: var(--m3-elevation-1) !important;
    background-color: color-mix(in srgb, var(--m3c-primary) 92%, white) !important;
  }

  :global(.run-btn:active:not(:disabled)) {
    border-radius: 12px !important;
    background-color: color-mix(in srgb, var(--m3c-primary) 88%, white) !important;
  }

  :global(.run-btn:disabled) {
    background-color: color-mix(in srgb, var(--m3c-on-surface) 12%, transparent) !important;
    color: color-mix(in srgb, var(--m3c-on-surface) 38%, transparent) !important;
    cursor: not-allowed !important;
    box-shadow: none !important;
  }

  /* Loading State */
  .loading-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    gap: 1rem;
    text-align: center;
    color: var(--m3c-on-surface-variant);
  }

  .loading-overlay p {
    font-weight: 600;
  }

  /* Error Display */
  .error-panel > :global(.m3-container) {
    background-color: var(--m3c-error-container);
    color: var(--m3c-on-error-container);
    border: 1px solid var(--m3c-error);
    padding: 1.25rem;
    border-radius: var(--m3-shape-large);
  }

  .error-flex {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  .error-text h4 {
    margin: 0 0 0.25rem;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .error-text p {
    margin: 0;
    font-size: 0.9rem;
    opacity: 0.9;
  }

  /* Results Display */
  .results-header-card > :global(.m3-container) {
    padding: 1.25rem;
    border-radius: var(--m3-shape-large);
    background-color: var(--m3c-primary-container-subtle);
  }

  .results-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .results-title-group h3 {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 800;
    letter-spacing: -0.3px;
  }

  .timestamp-label {
    font-size: 0.8rem;
    color: var(--m3c-on-surface-variant);
  }

  .actions-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .actions-group :global(.m3-container) {
    height: 38px !important;
    min-height: 38px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }

  .no-results > :global(.m3-container) {
    width: 100%;
    padding: 4rem 2rem;
    border-radius: var(--m3-shape-large);
    text-align: center;
  }

  .no-results-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--m3c-on-surface-variant);
  }

  .no-results-content h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .no-results-content p {
    margin: 0;
    font-size: 0.9rem;
  }

  /* Markdown report styles */
  :global(.markdown-report-card) {
    padding: 2.25rem !important;
    border-radius: var(--m3-shape-large) !important;
    border: 1px solid var(--m3c-outline-variant) !important;
    background-color: var(--m3c-surface-container-low) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 1.25rem !important;
    box-shadow: var(--m3-elevation-1) !important;
    transition: box-shadow 0.3s ease !important;
    margin-top: 1rem !important;
  }

  .report-header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    color: var(--m3c-primary);
  }

  .report-header h4 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    letter-spacing: -0.3px;
    font-family: var(--m3-font);
    color: var(--m3c-on-surface);
  }

  .report-body {
    font-size: 1rem;
    line-height: 1.625;
    color: var(--m3c-on-surface);
    font-family: var(--m3-font);
  }

  /* Headings following MD3 guidelines */
  .report-body :global(h1), 
  .report-body :global(h2), 
  .report-body :global(h3),
  .report-body :global(h4) {
    font-family: var(--m3-font);
    font-weight: 700;
    color: var(--m3c-on-surface);
    line-height: 1.35;
    margin-top: 1.75rem;
    margin-bottom: 0.75rem;
    letter-spacing: -0.015em;
  }

  .report-body :global(h1) {
    font-size: 1.6rem;
    color: var(--m3c-primary);
    border-bottom: 1px solid var(--m3c-outline-variant);
    padding-bottom: 0.5rem;
    margin-top: 2rem;
  }

  .report-body :global(h2) {
    font-size: 1.35rem;
    color: var(--m3c-secondary);
    margin-top: 1.6rem;
  }

  .report-body :global(h3) {
    font-size: 1.15rem;
    margin-top: 1.3rem;
  }

  .report-body :global(p) {
    margin: 0 0 1.125rem 0;
  }

  .report-body :global(strong) {
    color: var(--m3c-on-surface);
    font-weight: 700;
  }

  .report-body :global(em) {
    font-style: italic;
    color: var(--m3c-on-surface-variant);
  }

  /* Lists styling */
  .report-body :global(ul), 
  .report-body :global(ol) {
    margin: 0 0 1.25rem 0;
    padding-left: 1.5rem;
  }

  .report-body :global(li) {
    margin-bottom: 0.5rem;
    line-height: 1.6;
  }

  .report-body :global(ul li) {
    list-style-type: none;
    position: relative;
  }

  .report-body :global(ul li::before) {
    content: "•";
    color: var(--m3c-primary);
    font-weight: bold;
    display: inline-block;
    width: 1em;
    margin-left: -1em;
    font-size: 1.1rem;
    vertical-align: middle;
  }

  .report-body :global(ol li) {
    list-style-type: decimal;
  }

  /* Code and Pre Blocks */
  .report-body :global(code:not(pre code)) {
    font-family: var(--m3-font-mono);
    font-size: 0.875em;
    background-color: var(--m3c-surface-container-high);
    color: var(--m3c-on-surface-variant);
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
    border: 1px solid var(--m3c-outline-variant);
    word-break: break-word;
  }

  .report-body :global(pre.code-block) {
    font-family: var(--m3-font-mono);
    font-size: 0.9rem;
    background-color: var(--m3c-surface-container-lowest);
    border: 1px solid var(--m3c-outline-variant);
    border-radius: var(--m3-shape-medium);
    padding: 1.25rem;
    margin: 1.25rem 0;
    overflow-x: auto;
    white-space: pre;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .report-body :global(pre.code-block code) {
    font-family: inherit;
    font-size: inherit;
    background-color: transparent;
    border: none;
    padding: 0;
    border-radius: 0;
    color: var(--m3c-on-surface-variant);
  }

  /* Blockquotes */
  .report-body :global(blockquote) {
    margin: 1.5rem 0;
    padding: 0.75rem 1.25rem;
    border-left: 4px solid var(--m3c-secondary);
    background-color: var(--m3c-surface-container-low);
    border-radius: 0 var(--m3-shape-medium) var(--m3-shape-medium) 0;
    font-style: italic;
    color: var(--m3c-on-surface-variant);
  }

  /* Tables */
  .report-body :global(.table-container) {
    width: 100%;
    overflow-x: auto;
    margin: 1.5rem 0;
    border-radius: var(--m3-shape-medium);
    border: 1px solid var(--m3c-outline-variant);
    background-color: var(--m3c-surface);
    box-shadow: var(--m3-elevation-1);
  }

  .report-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    text-align: left;
  }

  .report-body :global(th), 
  .report-body :global(td) {
    padding: 12px 16px;
    border-bottom: 1px solid var(--m3c-outline-variant);
  }

  .report-body :global(th) {
    background-color: var(--m3c-surface-container-high);
    color: var(--m3c-on-surface);
    font-weight: 700;
  }

  .report-body :global(tbody tr:last-child td) {
    border-bottom: none;
  }

  .report-body :global(tbody tr:hover) {
    background-color: var(--m3c-surface-container-low);
  }

  /* Callout Panels for Security Warnings */
  .report-body :global(.callout) {
    display: flex;
    gap: 1rem;
    margin: 1.5rem 0;
    padding: 1.25rem;
    border-radius: var(--m3-shape-medium);
    align-items: flex-start;
  }

  .report-body :global(.callout-warning) {
    background-color: var(--m3c-error-container);
    color: var(--m3c-on-error-container);
    border: 1px solid var(--m3c-error);
    box-shadow: var(--m3-elevation-1);
  }

  .report-body :global(.callout-icon) {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--m3c-error);
  }

  .report-body :global(.callout-icon svg) {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }

  .report-body :global(.callout-content) {
    font-size: 0.95rem;
    line-height: 1.5;
    flex-grow: 1;
  }

  .report-body :global(.callout-content strong) {
    color: var(--m3c-on-error-container);
    font-weight: 700;
  }

  /* Responsive styling (Mobile / Screen width < 600px) */
  @media (max-width: 600px) {
    .app-layout {
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .pc-sidebar {
      display: none !important;
    }

    .mobile-nav-container {
      display: block !important;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      width: 100%;
      border-top: 1px solid var(--m3c-outline-variant);
      box-shadow: var(--m3-elevation-2);
      z-index: 100;
      background-color: var(--m3c-surface-container);
    }

    .mobile-nav-container > :global(.m3-container) {
      width: 100% !important;
      height: 100% !important;
      flex-direction: row !important;
      justify-content: space-evenly !important;
      align-items: center !important;
      padding: 0 !important;
    }

    .content-workspace {
      padding: 1.5rem 1rem 2.5rem 1rem !important;
      height: calc(100vh - 64px) !important;
      max-height: calc(100vh - 64px) !important;
      overflow-y: auto !important;
    }

    /* Hide panels not active in mobile */
    .app-layout.show-search .content-workspace :global(> :not(.search-panel)) { display: none !important; }
    .app-layout.show-results .content-workspace :global(> :not(.results-panel)) { display: none !important; }
    .app-layout.show-history .content-workspace :global(> :not(.history-panel)) { display: none !important; }
    .app-layout.show-settings .content-workspace :global(> :not(.settings-panel)) { display: none !important; }
  }
</style>
