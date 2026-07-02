import type { GithubRepoInfo } from "./github";

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

export async function analyzeWithGemini(
  repoOwner: string,
  repoName: string,
  data: Partial<GithubRepoInfo>,
  model: string,
  apiKey: string
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const readmeSnippet = data.readme
    ? data.readme.substring(0, 8000) + (data.readme.length > 8000 ? "\n[...README TRUNCATED...]" : "")
    : "No README provided.";

  const contextData = {
    owner: repoOwner,
    repo: repoName,
    stars: data.stars,
    watchers: data.watchers,
    commits: data.commits?.map(c => ({
      sha: c.sha.substring(0, 7),
      author: c.authorName,
      message: c.message,
      date: c.date,
    })),
    emailLeaks: data.emailLeaks?.map(l => ({
      author: l.authorName,
      email: l.email,
      isLeak: l.isLeak,
    })),
    releases: data.releases?.map(r => ({
      name: r.name,
      tagName: r.tagName,
      publishedAt: r.publishedAt,
      downloadCount: r.downloadCount,
      reactions: r.reactions,
    })),
    issues: data.issues?.map(i => ({
      number: i.number,
      title: i.title,
      state: i.state,
      author: i.author,
      createdAt: i.createdAt,
    })),
    prs: data.prs?.map(p => ({
      number: p.number,
      title: p.title,
      state: p.state,
      author: p.author,
      createdAt: p.createdAt,
    })),
    discussions: data.discussions?.map(d => ({
      title: d.title,
      author: d.author,
      comments: d.commentsCount,
    })),
  };

  const systemInstructions = `
You are an expert software developer and security auditor.
Analyze the provided GitHub repository statistics, metadata, and README.
Your report MUST contain:
1. Executive Summary: What is this project and its purpose?
2. Release Statistics & Trends: Release cadence, downloads, and community reactions (what releases are popular?).
3. Project Health & Activity: Commits frequency, open/closed issues, and PR stats.
4. Security Audit: Specifically highlight any leaked email addresses found in the latest commits (e.g. personal @gmail.com or other domains, while @proton.me or noreply are acceptable). Explicitly warn if a real email leak is detected.
5. Overall Recommendations: Strategic tips to improve the repo's structure, README, CI/CD, or community engagement.

Respond in English, using professional, direct, and precise technical language. Use clear markdown formatting, code highlights, and bullet points.
  `;

  const prompt = `
Analyze this repository: ${repoOwner}/${repoName}.
Here is the extracted data:
${JSON.stringify(contextData, null, 2)}

Here is the README snippet:
\`\`\`markdown
${readmeSnippet}
\`\`\`
  `;

  const body = {
    contents: [
      {
        parts: [
          {
            text: systemInstructions + "\n\n" + prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048
    }
  };

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorMessage = response.statusText || "";
    try {
      const errorJson = await response.json();
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      }
    } catch {
      try {
        errorMessage = await response.text();
      } catch {
      }
    }

    if (response.status === 429) {
      throw new Error(`Gemini API rate limit exceeded (429). Please wait a moment before trying again.`);
    }
    if (response.status === 400 && errorMessage.toLowerCase().includes("key")) {
      throw new Error(`Invalid Gemini API Key. Please verify your API key in Settings.`);
    }
    throw new Error(`Gemini API Error (${response.status}): ${errorMessage || "Unknown error"}`);
  }

  const resultData = await response.json();
  const text = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response text returned from Gemini API.");
  }

  return text;
}
