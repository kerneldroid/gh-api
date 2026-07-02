<script lang="ts">
  import { Card, Divider, Button, Icon } from "m3-svelte";
  import type { AnalysisRecord } from "../storage";
  import { exportAnalysisToZip } from "../zipExporter";

  import iconFolder from "@ktibow/iconset-material-symbols/folder";
  import iconDownload from "@ktibow/iconset-material-symbols/download";
  import iconDelete from "@ktibow/iconset-material-symbols/delete";
  import iconOpen from "@ktibow/iconset-material-symbols/visibility";

  let {
    records,
    onselectRecord,
    ondeleteRecord
  } = $props<{
    records: AnalysisRecord[];
    onselectRecord: (record: AnalysisRecord) => void;
    ondeleteRecord: (id: string) => void;
  }>();

  function formatTimestamp(t: string): string {
    // Format: YYYY-MM-DD HH:mm:ss
    try {
      const parts = t.split("_");
      if (parts.length === 2) {
        const date = parts[0];
        const time = parts[1].replace(/-/g, ":");
        return `${date} ${time}`;
      }
      return t;
    } catch {
      return t;
    }
  }
</script>

<div class="history-view-container">
  {#if records.length === 0}
    <div class="no-records-card">
      <Card variant="outlined">
        <div class="no-records-content">
          <Icon icon={iconFolder} size={48} />
          <h3>No analysis history found</h3>
          <p>Go to the Search tab, enter a repository, and run an analysis to save your first record.</p>
        </div>
      </Card>
    </div>
  {:else}
    <div class="records-list">
      {#each records as record (record.id)}
        <Card variant="outlined" class="record-card">
          <!-- Absolute delete button in the top-right corner of the card -->
          <Button variant="text" onclick={() => ondeleteRecord(record.id)} class="delete-icon-btn" aria-label="Delete Record">
            <Icon icon={iconDelete} size={18} />
          </Button>

          <div class="record-info">
            <h4 class="record-title">{record.owner}/{record.repo}</h4>
            <div class="record-meta">
              <span class="meta-tag model-tag">{record.model}</span>
              <span class="meta-date">Analyzed: <strong>{formatTimestamp(record.timestamp)}</strong></span>
            </div>
          </div>

          <Divider />

          <div class="record-actions">
            <Button variant="filled" iconType="left" onclick={() => onselectRecord(record)}>
              <Icon icon={iconOpen} size={16} />
              View Analysis
            </Button>
            <Button variant="tonal" iconType="left" onclick={() => exportAnalysisToZip(record)}>
              <Icon icon={iconDownload} size={16} />
              Download ZIP
            </Button>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>

<style>
  .history-view-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .no-records-card > :global(.m3-container) {
    width: 100%;
    padding: 3rem 2rem;
    border-radius: var(--m3-shape-large);
    text-align: center;
  }

  .no-records-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--m3c-on-surface-variant);
  }

  .no-records-content h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .no-records-content p {
    margin: 0;
    font-size: 0.9rem;
    max-width: 400px;
  }

  .records-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.record-card) {
    position: relative !important;
    margin-bottom: 1.25rem !important;
    padding: 1.25rem 3.5rem 1.25rem 1.25rem !important;
    border-radius: var(--m3-shape-medium) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 0.85rem !important;
  }

  .record-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .record-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--m3c-primary);
  }

  .record-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: var(--m3c-on-surface-variant);
  }

  .meta-tag {
    font-size: 0.7rem;
    background-color: var(--m3c-secondary-container);
    color: var(--m3c-on-secondary-container);
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-weight: 700;
  }

  :global(.delete-icon-btn) {
    position: absolute !important;
    top: 0.75rem !important;
    right: 0.75rem !important;
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    min-height: 36px !important;
    padding: 0 !important;
    border-radius: 50% !important;
    border: none !important;
    background: transparent !important;
    color: var(--m3c-error) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer;
    transition: background-color 0.2s ease !important;
  }

  :global(.delete-icon-btn:hover) {
    background-color: color-mix(in srgb, var(--m3c-error) 12%, transparent) !important;
  }

  .record-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .record-actions :global(.m3-container) {
    height: 36px !important;
    min-height: 36px !important;
    font-size: 0.8rem !important;
    padding: 0 16px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
</style>
