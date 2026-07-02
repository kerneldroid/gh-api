<script lang="ts">
  import { Card, TextField, Button, Switch, Divider, Select, Icon } from "m3-svelte";
  import type { ExtractionOptions } from "../github";
  import { toastState } from "../toast.svelte";
  import iconSave from "@ktibow/iconset-material-symbols/save";

  let {
    githubToken = $bindable(),
    geminiKey = $bindable(),
    selectedModel = $bindable(),
    options = $bindable(),
  } = $props<{
    githubToken: string;
    geminiKey: string;
    selectedModel: string;
    options: ExtractionOptions;
  }>();

  const modelOptions = [
    { text: "Gemini 3.5 Flash", value: "gemini-3.5-flash" },
    { text: "Gemini 3.1 Pro (Preview)", value: "gemini-3.1-pro-preview" },
    { text: "Gemini 3.1 Flash-Lite", value: "gemini-3.1-flash-lite" }
  ];

  function saveKeys() {
    localStorage.setItem("gh_api_github_token", githubToken.trim());
    localStorage.setItem("gh_api_gemini_key", geminiKey.trim());
    localStorage.setItem("gh_api_gemini_model", selectedModel);
    toastState.show("Settings saved successfully!", "success");
  }
</script>

<div class="settings-container">
  <div class="settings-section">
    <Card variant="outlined">
      <div class="card-header">
        <h3>API Credentials</h3>
        <p>Credentials are stored locally in your browser's localStorage.</p>
      </div>

      <div class="fields-grid">
        <div class="field-item">
          <TextField 
            label="GitHub Personal Access Token" 
            type="password" 
            bind:value={githubToken} 
          />
          <span class="helper-text">Required to fetch private repos and bypass public rate limits.</span>
        </div>

        <div class="field-item">
          <TextField 
            label="Gemini API Key" 
            type="password" 
            bind:value={geminiKey} 
          />
          <span class="helper-text">Required to perform AI code analysis and security scans.</span>
        </div>

        <div class="field-item">
          <Select 
            label="Gemini AI Model"
            options={modelOptions}
            bind:value={selectedModel}
          />
          <span class="helper-text">Choose the active intelligence engine.</span>
        </div>
      </div>

      <div class="save-actions">
        <Button onclick={saveKeys} iconType="left">
          <Icon icon={iconSave} size={18} />
          Save API Config
        </Button>
      </div>
    </Card>
  </div>

  <div class="settings-section">
    <Card variant="outlined">
      <div class="card-header">
        <h3>Extraction Parameters</h3>
        <p>Configure which data points should be parsed from the target repository.</p>
      </div>

      <div class="toggles-grid">
        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Stars Count</strong>
            <span>Total stargazers counter</span>
          </div>
          <Switch bind:checked={options.stars} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Watchers Count</strong>
            <span>Watchers & subscribers tracking</span>
          </div>
          <Switch bind:checked={options.watchers} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>README.md</strong>
            <span>Extract & analyze readme contents</span>
          </div>
          <Switch bind:checked={options.readme} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Releases</strong>
            <span>Download counts, assets metadata, and release reactions</span>
          </div>
          <Switch bind:checked={options.releases} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Latest Commits</strong>
            <span>Fetch metadata of the last 10 commits</span>
          </div>
          <Switch bind:checked={options.commits} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Security Email Auditing</strong>
            <span>Scan commits for leaked personal emails (e.g. gmail.com)</span>
          </div>
          <Switch bind:checked={options.emailLeaks} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Issues</strong>
            <span>List status of the last 10 issues</span>
          </div>
          <Switch bind:checked={options.issues} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Pull Requests</strong>
            <span>Extract details of the last 10 PRs</span>
          </div>
          <Switch bind:checked={options.prs} />
        </label>

        <label class="toggle-row">
          <div class="toggle-desc">
            <strong>Discussions</strong>
            <span>Parse repository Q&A and discussion topics (GraphQL)</span>
          </div>
          <Switch bind:checked={options.discussions} />
        </label>
      </div>
    </Card>
  </div>
</div>

<style>
  .settings-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
  }

  .settings-section > :global(.m3-container) {
    width: 100%;
    padding: 1.5rem;
    border-radius: var(--m3-shape-large);
  }

  .card-header {
    margin-bottom: 1.25rem;
  }

  .card-header h3 {
    margin: 0 0 0.25rem;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .card-header p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--m3c-on-surface-variant);
  }

  .fields-grid {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .field-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .field-item > :global(.m3-container) {
    padding: 0 !important;
  }

  .helper-text {
    font-size: 0.75rem;
    color: var(--m3c-on-surface-variant);
    padding-left: 0.5rem;
  }

  .save-actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
  }

  .toggles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background-color: var(--m3c-surface-container-low);
    border: 1px solid var(--m3c-outline-variant);
    border-radius: var(--m3-shape-medium);
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .toggle-row:hover {
    background-color: var(--m3c-surface-container-high);
  }

  .toggle-desc {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding-right: 0.5rem;
  }

  .toggle-desc strong {
    font-size: 0.9rem;
    font-weight: 700;
  }

  .toggle-desc span {
    font-size: 0.75rem;
    color: var(--m3c-on-surface-variant);
  }
</style>
