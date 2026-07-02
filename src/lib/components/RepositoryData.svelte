<script lang="ts">
  import { Card, Divider, Icon, ConnectedButtons, Button } from "m3-svelte";
  import type { GithubRepoInfo } from "../github";

  import iconStar from "@ktibow/iconset-material-symbols/star";
  import iconVisibility from "@ktibow/iconset-material-symbols/visibility";
  import iconCommit from "@ktibow/iconset-material-symbols/code";
  import iconRelease from "@ktibow/iconset-material-symbols/sell";
  import iconDownload from "@ktibow/iconset-material-symbols/download";
  import iconIssue from "@ktibow/iconset-material-symbols/bug-report";
  import iconPR from "@ktibow/iconset-material-symbols/call-merge";
  import iconDiscussion from "@ktibow/iconset-material-symbols/forum";
  import iconReadme from "@ktibow/iconset-material-symbols/description";
  import iconShield from "@ktibow/iconset-material-symbols/security";
  import iconWarning from "@ktibow/iconset-material-symbols/warning";
  import iconCheck from "@ktibow/iconset-material-symbols/check-circle";

  let { data } = $props<{ data: Partial<GithubRepoInfo> }>();

  let activeSection = $state("overview");

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const leaksCount = $derived(data.emailLeaks?.filter((l: any) => l.isLeak).length || 0);
</script>

<div class="repo-data-container">
  <div class="navigation-tabs">
    <div class="tabs-list">
      <Button variant={activeSection === "overview" ? "filled" : "tonal"} onclick={() => activeSection = "overview"}>Overview</Button>
      {#if data.commits}
        <Button variant={activeSection === "commits" ? "filled" : "tonal"} onclick={() => activeSection = "commits"}>Commits</Button>
      {/if}
      {#if data.releases && data.releases.length > 0}
        <Button variant={activeSection === "releases" ? "filled" : "tonal"} onclick={() => activeSection = "releases"}>Releases</Button>
      {/if}
      {#if data.issues || data.prs}
        <Button variant={activeSection === "issues_prs" ? "filled" : "tonal"} onclick={() => activeSection = "issues_prs"}>Issues & PRs</Button>
      {/if}
      {#if data.discussions && data.discussions.length > 0}
        <Button variant={activeSection === "discussions" ? "filled" : "tonal"} onclick={() => activeSection = "discussions"}>Discussions</Button>
      {/if}
      {#if data.readme}
        <Button variant={activeSection === "readme" ? "filled" : "tonal"} onclick={() => activeSection = "readme"}>README</Button>
      {/if}
    </div>
  </div>

  <div class="section-content">
    {#if activeSection === "overview"}
      <div class="overview-grid">
        <Card variant="filled" class="stat-card">
          <div class="stat-icon stars"><Icon icon={iconStar} size={32} /></div>
          <div class="stat-info">
            <span class="stat-val">{data.stars !== undefined ? data.stars.toLocaleString() : "N/A"}</span>
            <span class="stat-lbl">Stars</span>
          </div>
        </Card>

        <Card variant="filled" class="stat-card">
          <div class="stat-icon watchers"><Icon icon={iconVisibility} size={32} /></div>
          <div class="stat-info">
            <span class="stat-val">{data.watchers !== undefined ? data.watchers.toLocaleString() : "N/A"}</span>
            <span class="stat-lbl">Watchers</span>
          </div>
        </Card>

        <Card variant="filled" class="stat-card" style={leaksCount > 0 ? "border: 2px solid var(--m3c-error);" : ""}>
          <div class="stat-icon leaks" style={leaksCount > 0 ? "background: var(--m3c-error-container); color: var(--m3c-error);" : ""}>
            <Icon icon={iconShield} size={32} />
          </div>
          <div class="stat-info">
            <span class="stat-val">{leaksCount}</span>
            <span class="stat-lbl">Leaked Emails</span>
          </div>
        </Card>
      </div>

      {#if data.emailLeaks && data.emailLeaks.length > 0}
        <div class="leaks-card-area">
          <Card variant="outlined">
            <div class="card-header">
              <Icon icon={iconShield} size={20} />
              <h4>Email Security Audit Results</h4>
            </div>
            <Divider />
            <div class="leaks-list">
              {#each data.emailLeaks as leak}
                <div class="leak-item" class:is-leak={leak.isLeak}>
                  <div class="leak-status">
                    <Icon icon={leak.isLeak ? iconWarning : iconCheck} size={18} />
                  </div>
                  <div class="leak-details">
                    <span class="leak-author"><strong>{leak.authorName}</strong></span>
                    <span class="leak-email">{leak.email}</span>
                  </div>
                  <span class="leak-verdict badge-{leak.isLeak ? 'danger' : 'success'}">
                    {leak.isLeak ? "LEAKED PRIVATE EMAIL" : "SECURE / NOREPLY"}
                  </span>
                </div>
              {/each}
            </div>
          </Card>
        </div>
      {/if}

    {:else if activeSection === "commits"}
      <div class="commits-list">
        {#each data.commits || [] as commit}
          <Card variant="outlined" class="commit-card">
            <div class="commit-header">
              <span class="commit-sha">{commit.sha.substring(0, 7)}</span>
              <span class="commit-date">{formatDate(commit.date)}</span>
            </div>
            <p class="commit-msg">{commit.message}</p>
            <div class="commit-meta">
              <span class="commit-author">By: <strong>{commit.authorName}</strong> ({commit.authorEmail})</span>
              <a href={commit.url} target="_blank" rel="noopener noreferrer" class="external-link">View Commit</a>
            </div>
          </Card>
        {/each}
      </div>

    {:else if activeSection === "releases"}
      <div class="releases-list">
        {#each data.releases || [] as rel}
          <Card variant="outlined" class="release-card">
            <div class="release-header-row">
              <div class="release-title-block">
                <Icon icon={iconRelease} size={20} />
                <h4>{rel.name || rel.tagName}</h4>
                <span class="release-tag">{rel.tagName}</span>
              </div>
              <span class="release-date">{formatDate(rel.publishedAt)}</span>
            </div>

            <p class="release-body-preview">{rel.body ? rel.body.substring(0, 200) + (rel.body.length > 200 ? "..." : "") : "No release notes description."}</p>

            <Divider />

            <div class="release-stats-row">
              <div class="release-downloads">
                <Icon icon={iconDownload} size={16} />
                <span>Total Downloads: <strong>{rel.downloadCount.toLocaleString()}</strong></span>
              </div>
              {#if rel.reactions && rel.reactions.total > 0}
                <div class="reactions-chips-list">
                  {#if rel.reactions.like > 0} <span class="reaction-badge">👍 {rel.reactions.like}</span> {/if}
                  {#if rel.reactions.heart > 0} <span class="reaction-badge">❤️ {rel.reactions.heart}</span> {/if}
                  {#if rel.reactions.hooray > 0} <span class="reaction-badge">🎉 {rel.reactions.hooray}</span> {/if}
                  {#if rel.reactions.rocket > 0} <span class="reaction-badge">🚀 {rel.reactions.rocket}</span> {/if}
                </div>
              {/if}
            </div>

            {#if rel.assets && rel.assets.length > 0}
              <div class="assets-sublist">
                <h5>Assets:</h5>
                <ul>
                  {#each rel.assets as asset}
                    <li>
                      <a href={asset.url} target="_blank" rel="noopener noreferrer" class="asset-link">{asset.name}</a>
                      <span class="asset-meta">({formatBytes(asset.size)} — {asset.downloadCount.toLocaleString()} downloads)</span>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </Card>
        {/each}
      </div>

    {:else if activeSection === "issues_prs"}
      <div class="issues-prs-layout">
        {#if data.issues}
          <div class="issues-column">
            <h3>Recent Issues</h3>
            <div class="items-list">
              {#each data.issues as issue}
                <Card variant="outlined" class="item-card border-{issue.state}">
                  <div class="item-header">
                    <span class="item-number">#{issue.number}</span>
                    <span class="item-state badge-{issue.state}">{issue.state.toUpperCase()}</span>
                  </div>
                  <h4 class="item-title"><a href={issue.url} target="_blank" rel="noopener noreferrer">{issue.title}</a></h4>
                  <div class="item-footer">
                    <span>Opened by: <strong>{issue.author}</strong></span>
                    <span>💬 {issue.commentsCount} comments</span>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}

        {#if data.prs}
          <div class="prs-column">
            <h3>Recent Pull Requests</h3>
            <div class="items-list">
              {#each data.prs as pr}
                <Card variant="outlined" class="item-card border-{pr.state}">
                  <div class="item-header">
                    <span class="item-number">#{pr.number}</span>
                    <span class="item-state badge-{pr.state}">{pr.state.toUpperCase()}</span>
                  </div>
                  <h4 class="item-title"><a href={pr.url} target="_blank" rel="noopener noreferrer">{pr.title}</a></h4>
                  <div class="item-footer">
                    <span>Opened by: <strong>{pr.author}</strong></span>
                  </div>
                </Card>
              {/each}
            </div>
          </div>
        {/if}
      </div>

    {:else if activeSection === "discussions"}
      <div class="discussions-list">
        {#each data.discussions || [] as disc}
          <Card variant="outlined" class="discussion-card">
            <div class="discussion-header">
              <Icon icon={iconDiscussion} size={20} />
              <h4><a href={disc.url} target="_blank" rel="noopener noreferrer">{disc.title}</a></h4>
            </div>
            <div class="discussion-footer">
              <span>Author: <strong>{disc.author}</strong></span>
              <span>💬 {disc.commentsCount} comments</span>
            </div>
          </Card>
        {/each}
      </div>

    {:else if activeSection === "readme"}
      <Card variant="outlined" class="readme-card">
        <div class="readme-header">
          <Icon icon={iconReadme} size={20} />
          <h4>README.md File Preview</h4>
        </div>
        <Divider />
        <pre class="readme-pre"><code>{data.readme}</code></pre>
      </Card>
    {/if}
  </div>
</div>

<style>
  .repo-data-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
  }

  .navigation-tabs {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .tabs-list {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.25rem;
    margin-bottom: 1.5rem;
  }

  :global(.stat-card) {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 1.25rem !important;
    padding: 1.25rem !important;
    border-radius: var(--m3-shape-large) !important;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--m3c-primary-container);
    color: var(--m3c-on-primary-container);
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-val {
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1.2;
  }

  .stat-lbl {
    font-size: 0.8rem;
    color: var(--m3c-on-surface-variant);
  }

  .leaks-card-area > :global(.m3-container) {
    padding: 1.5rem;
    border-radius: var(--m3-shape-large);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .card-header h4 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .leaks-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .leak-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background-color: var(--m3c-surface-container-high);
    border: 1px solid var(--m3c-outline-variant);
    border-radius: var(--m3-shape-medium);
  }

  .leak-item.is-leak {
    background-color: var(--m3c-error-container);
    border-color: var(--m3c-error);
    color: var(--m3c-on-error-container);
  }

  .leak-status {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .leak-item.is-leak .leak-status {
    color: var(--m3c-error);
  }

  .leak-details {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .leak-author {
    font-size: 0.9rem;
  }

  .leak-email {
    font-size: 0.8rem;
    opacity: 0.85;
  }

  .leak-verdict {
    font-size: 0.7rem;
    font-weight: 800;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }

  .badge-danger {
    background-color: var(--m3c-error);
    color: var(--m3c-on-error);
  }

  .badge-success {
    background-color: var(--m3c-primary);
    color: var(--m3c-on-primary);
  }

  .commits-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.commit-card) {
    padding: 1.25rem !important;
    border-radius: var(--m3-shape-medium) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 0.5rem !important;
  }

  .commit-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--m3c-on-surface-variant);
  }

  .commit-sha {
    font-family: var(--m3-font-mono);
    font-weight: 700;
  }

  .commit-msg {
    margin: 0;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .commit-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;
    color: var(--m3c-on-surface-variant);
    margin-top: 0.25rem;
  }

  .external-link {
    color: var(--m3c-primary);
    text-decoration: none;
    font-weight: 700;
  }

  .external-link:hover {
    text-decoration: underline;
  }

  .releases-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.release-card) {
    padding: 1.5rem !important;
    border-radius: var(--m3-shape-large) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 0.75rem !important;
  }

  .release-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .release-title-block {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .release-title-block h4 {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
  }

  .release-tag {
    font-size: 0.75rem;
    background-color: var(--m3c-secondary-container);
    color: var(--m3c-on-secondary-container);
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
  }

  .release-date {
    font-size: 0.8rem;
    color: var(--m3c-on-surface-variant);
  }

  .release-body-preview {
    margin: 0;
    font-size: 0.85rem;
    color: var(--m3c-on-surface-variant);
    white-space: pre-wrap;
  }

  .release-stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .release-downloads {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.85rem;
  }

  .reactions-chips-list {
    display: flex;
    gap: 0.35rem;
  }

  .reaction-badge {
    font-size: 0.75rem;
    background-color: var(--m3c-surface-container-high);
    border: 1px solid var(--m3c-outline-variant);
    padding: 0.2rem 0.5rem;
    border-radius: 20px;
  }

  .assets-sublist h5 {
    margin: 0 0 0.35rem;
    font-size: 0.85rem;
    font-weight: 700;
  }

  .assets-sublist ul {
    list-style-type: none;
    padding-left: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .assets-sublist li {
    font-size: 0.8rem;
  }

  .asset-link {
    color: var(--m3c-primary);
    text-decoration: none;
    font-weight: 600;
  }

  .asset-link:hover {
    text-decoration: underline;
  }

  .asset-meta {
    color: var(--m3c-on-surface-variant);
    font-size: 0.75rem;
  }

  .issues-prs-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 800px) {
    .issues-prs-layout {
      grid-template-columns: 1fr;
    }
  }

  .issues-column, .prs-column {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .issues-column h3, .prs-column h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  :global(.item-card) {
    padding: 1rem !important;
    border-radius: var(--m3-shape-medium) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 0.35rem !important;
  }

  :global(.item-card.border-open) {
    border-left: 4px solid var(--m3c-primary) !important;
  }

  :global(.item-card.border-closed) {
    border-left: 4px solid var(--m3c-outline) !important;
  }

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .item-number {
    font-family: var(--m3-font-mono);
    font-size: 0.8rem;
    font-weight: 700;
  }

  .item-state {
    font-size: 0.65rem;
    font-weight: 800;
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
  }

  .badge-open {
    background-color: var(--m3c-primary-container);
    color: var(--m3c-on-primary-container);
  }

  .badge-closed {
    background-color: var(--m3c-surface-container-highest);
    color: var(--m3c-outline);
  }

  .item-title {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .item-title a {
    color: inherit;
    text-decoration: none;
  }

  .item-title a:hover {
    color: var(--m3c-primary);
    text-decoration: underline;
  }

  .item-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--m3c-on-surface-variant);
    margin-top: 0.25rem;
  }

  .discussions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  :global(.discussion-card) {
    padding: 1rem !important;
    border-radius: var(--m3-shape-medium) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 0.35rem !important;
  }

  .discussion-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .discussion-header h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
  }

  .discussion-header a {
    color: inherit;
    text-decoration: none;
  }

  .discussion-header a:hover {
    color: var(--m3c-primary);
    text-decoration: underline;
  }

  .discussion-footer {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: var(--m3c-on-surface-variant);
  }

  :global(.readme-card) {
    padding: 1.5rem !important;
    border-radius: var(--m3-shape-large) !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 1rem !important;
  }

  .readme-pre {
    background-color: var(--m3c-surface-container-low);
    padding: 1rem;
    border-radius: var(--m3-shape-medium);
    overflow-x: auto;
    margin: 0;
  }

  .readme-pre code {
    font-family: var(--m3-font-mono);
    font-size: 0.85rem;
    color: var(--m3c-on-surface);
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
