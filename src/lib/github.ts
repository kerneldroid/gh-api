export interface GithubRepoInfo {
  stars: number;
  watchers: number;
  readme: string;
  commits: GithubCommit[];
  releases: GithubRelease[];
  issues: GithubIssue[];
  prs: GithubPR[];
  discussions: GithubDiscussion[];
  emailLeaks: EmailLeak[];
}

export interface GithubCommit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  date: string;
  url: string;
}

export interface GithubRelease {
  id: number;
  name: string;
  tagName: string;
  publishedAt: string;
  body: string;
  downloadCount: number;
  assets: {
    name: string;
    size: number;
    downloadCount: number;
    url: string;
  }[];
  reactions: Record<string, number>;
}

export interface GithubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  createdAt: string;
  commentsCount: number;
  url: string;
}

export interface GithubPR {
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  createdAt: string;
  url: string;
}

export interface GithubDiscussion {
  title: string;
  url: string;
  author: string;
  commentsCount: number;
}

export interface EmailLeak {
  commitSha: string;
  authorName: string;
  email: string;
  isLeak: boolean;
}

export interface ExtractionOptions {
  stars: boolean;
  releases: boolean;
  discussions: boolean;
  commits: boolean;
  issues: boolean;
  prs: boolean;
  watchers: boolean;
  readme: boolean;
  emailLeaks: boolean;
}

export const defaultOptions: ExtractionOptions = {
  stars: true,
  releases: true,
  discussions: true,
  commits: true,
  issues: true,
  prs: true,
  watchers: true,
  readme: true,
  emailLeaks: true,
};

export class FatalGithubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalGithubError";
  }
}

/**
 * Parses repository input string, supporting "owner/repo" format or full URLs (optionally stripping .git).
 */
export function parseRepoString(input: string): { owner: string; repo: string } | null {
  const cleaned = input.trim();
  if (cleaned.startsWith("http")) {
    try {
      const url = new URL(cleaned);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) {
        let repo = parts[1];
        if (repo.endsWith(".git")) {
          repo = repo.slice(0, -4);
        }
        return { owner: parts[0], repo };
      }
    } catch {
      return null;
    }
  }
  const parts = cleaned.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    let repo = parts[1];
    if (repo.endsWith(".git")) {
      repo = repo.slice(0, -4);
    }
    return { owner: parts[0], repo };
  }
  return null;
}

async function fetchWithTimeout(
  resource: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 15000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

async function handleResponseError(res: Response, fallbackMessage: string): Promise<never> {
  let errorDetail = "";
  try {
    const errorJson = await res.json();
    errorDetail = errorJson.message || "";
  } catch {
  }

  const remaining = res.headers.get("X-RateLimit-Remaining");
  if (res.status === 403 && remaining === "0") {
    const resetTime = res.headers.get("X-RateLimit-Reset");
    const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString() : "later";
    throw new FatalGithubError(
      `GitHub API rate limit exceeded. Limit resets at ${resetDate}. ` +
      (errorDetail ? `Details: ${errorDetail}. ` : "") +
      `Please provide a GitHub Personal Access Token in Settings to bypass this.`
    );
  }

  if (res.status === 401 || res.status === 403) {
    throw new FatalGithubError(
      `Access denied (${res.status}): ${errorDetail || "Unauthorized"}. ` +
      `Please check that your GitHub Personal Access Token is valid and has correct permissions.`
    );
  }

  if (res.status === 404) {
    throw new FatalGithubError(`Repository not found (404). Please check the owner and repository name.`);
  }

  throw new Error(`${fallbackMessage} (${res.status}): ${errorDetail || res.statusText}`);
}

async function checkResponseOk(res: Response, fallbackMessage: string): Promise<boolean> {
  if (res.ok) {
    return true;
  }
  await handleResponseError(res, fallbackMessage);
  return false;
}

export async function fetchGithubData(
  owner: string,
  repo: string,
  token: string,
  options: ExtractionOptions,
  onProgress: (stage: string) => void
): Promise<Partial<GithubRepoInfo>> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token && token.trim()) {
    headers["Authorization"] = `token ${token.trim()}`;
  }

  const result: Partial<GithubRepoInfo> = {};

  if (options.stars || options.watchers) {
    onProgress("Fetching repository details...");
    const res = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    await checkResponseOk(res, "Failed to fetch repository details");
    const data = await res.json();
    if (options.stars) result.stars = data.stargazers_count;
    if (options.watchers) result.watchers = data.subscribers_count;
  }

  if (options.readme) {
    onProgress("Fetching README...");
    try {
      const res = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
      if (await checkResponseOk(res, "Failed to fetch README")) {
        const data = await res.json();
        const content = data.content || "";
        const binaryString = atob(content.replace(/\s/g, ""));
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        result.readme = new TextDecoder("utf-8").decode(bytes);
      } else {
        result.readme = "README not found or inaccessible.";
      }
    } catch (e: any) {
      if (e instanceof FatalGithubError) {
        throw e;
      }
      result.readme = `Failed to load README: ${e.message}`;
    }
  }

  if (options.commits || options.emailLeaks) {
    onProgress("Fetching latest commits...");
    try {
      const res = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers });
      if (await checkResponseOk(res, "Failed to fetch commits")) {
        const data = await res.json();
        const commits: GithubCommit[] = data.map((item: any) => ({
          sha: item.sha,
          message: item.commit.message,
          authorName: item.commit.author?.name || "Unknown",
          authorEmail: item.commit.author?.email || "",
          date: item.commit.author?.date || "",
          url: item.html_url,
        }));
        result.commits = commits;

        if (options.emailLeaks) {
          onProgress("Analyzing commit emails for potential leaks...");
          const leaks: EmailLeak[] = [];
          const personalDomains = [
            "gmail.com",
            "yahoo.com",
            "outlook.com",
            "hotmail.com",
            "mail.ru",
            "yandex.ru",
            "yandex.com",
            "icloud.com",
            "live.com",
            "msn.com",
            "aol.com",
            "gmx.com",
            "gmx.net",
            "web.de",
            "mail.com",
            "zoho.com",
            "fastmail.com",
            "fastmail.fm",
            "hushmail.com",
            "me.com",
            "mac.com"
          ];

          for (const c of commits) {
            const email = c.authorEmail.toLowerCase();
            if (email) {
              const isOk =
                email.endsWith(".noreply.github.com") ||
                email.includes("noreply") ||
                email.endsWith("@proton.me") ||
                email.endsWith("@protonmail.ch") ||
                email.endsWith("@protonmail.com");
              
              const domain = email.substring(email.lastIndexOf("@") + 1);
              const isPersonalLeak = !isOk && personalDomains.includes(domain);

              leaks.push({
                commitSha: c.sha,
                authorName: c.authorName,
                email: c.authorEmail,
                isLeak: isPersonalLeak,
              });
            }
          }
          result.emailLeaks = leaks;
        }
      }
    } catch (e: any) {
      if (e instanceof FatalGithubError) {
        throw e;
      }
      console.error("Commits fetch failed", e);
    }
  }

  if (options.releases) {
    onProgress("Fetching releases...");
    try {
      const res = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=10`, { headers });
      if (await checkResponseOk(res, "Failed to fetch releases")) {
        const data = await res.json();
        const releases: GithubRelease[] = [];
        
        for (const item of data) {
          let downloadCount = 0;
          const assets = (item.assets || []).map((asset: any) => {
            downloadCount += asset.download_count;
            return {
              name: asset.name,
              size: asset.size,
              downloadCount: asset.download_count,
              url: asset.browser_download_url,
            };
          });

          const reactions: Record<string, number> = item.reactions || {};

          releases.push({
            id: item.id,
            name: item.name || item.tag_name,
            tagName: item.tag_name,
            publishedAt: item.published_at,
            body: item.body || "",
            downloadCount,
            assets,
            reactions: {
              like: reactions["+1"] || 0,
              dislike: reactions["-1"] || 0,
              laugh: reactions["laugh"] || 0,
              confused: reactions["confused"] || 0,
              heart: reactions["heart"] || 0,
              hooray: reactions["hooray"] || 0,
              rocket: reactions["rocket"] || 0,
              eyes: reactions["eyes"] || 0,
              total: reactions["total_count"] || 0,
            },
          });
        }
        result.releases = releases;
      }
    } catch (e: any) {
      if (e instanceof FatalGithubError) {
        throw e;
      }
      console.error("Releases fetch failed", e);
    }
  }

  if (options.issues || options.prs) {
    onProgress("Fetching issues & pull requests...");
    try {
      const [openRes, closedRes] = await Promise.all([
        fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=20`, { headers }),
        fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/issues?state=closed&per_page=20`, { headers }),
      ]);

      let openData: any[] = [];
      let closedData: any[] = [];

      if (await checkResponseOk(openRes, "Failed to fetch open issues")) {
        openData = await openRes.json();
      }
      if (await checkResponseOk(closedRes, "Failed to fetch closed issues")) {
        closedData = await closedRes.json();
      }

      const combined = [...openData, ...closedData].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const rawIssues = combined.filter(item => !item.pull_request);
      const rawPRs = combined.filter(item => item.pull_request);

      if (options.issues) {
        result.issues = rawIssues.slice(0, 10).map((item: any) => ({
          number: item.number,
          title: item.title,
          state: item.state,
          author: item.user?.login || "Unknown",
          createdAt: item.created_at,
          commentsCount: item.comments,
          url: item.html_url,
        }));
      }

      if (options.prs) {
        result.prs = rawPRs.slice(0, 10).map((item: any) => ({
          number: item.number,
          title: item.title,
          state: item.state,
          author: item.user?.login || "Unknown",
          createdAt: item.created_at,
          url: item.html_url,
        }));
      }
    } catch (e: any) {
      if (e instanceof FatalGithubError) {
        throw e;
      }
      console.error("Issues/PRs fetch failed", e);
    }
  }

  if (options.discussions && token) {
    onProgress("Fetching discussions (GraphQL)...");
    try {
      const query = `
        query($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            discussions(first: 10) {
              nodes {
                title
                url
                author {
                  login
                }
                comments(first: 1) {
                  totalCount
                }
              }
            }
          }
        }
      `;

      const response = await fetchWithTimeout("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          variables: { owner, name: repo },
        }),
      });

      if (await checkResponseOk(response, "Failed to fetch discussions")) {
        const body = await response.json();
        const nodes = body.data?.repository?.discussions?.nodes || [];
        result.discussions = nodes.map((node: any) => ({
          title: node.title,
          url: node.url,
          author: node.author?.login || "Unknown",
          commentsCount: node.comments?.totalCount || 0,
        }));
      }
    } catch (e: any) {
      if (e instanceof FatalGithubError) {
        throw e;
      }
      console.error("Discussions fetch failed", e);
    }
  }

  onProgress("Data extraction complete!");
  return result;
}
