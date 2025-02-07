export async function getIssues(token, owner, repo) {
  let issues = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`,
        { headers: { Authorization: `token ${token}` } }
      );
      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }
      const data = await response.json();
      issues = issues.concat(data);
      hasMore = data.length >= 100;
      page++;
    } catch (error) {
      console.error("Error fetching issues:", error);
      hasMore = false;
    }
  }
  return issues;
}

export async function getCommits(token, owner, repo) {
  let commits = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${page}`,
      { headers: { Authorization: `token ${token}` } }
    );
    const data = await response.json();
    commits = commits.concat(data);
    hasMore = data.length >= 100;
    page++;
  }
  return commits;
}

export async function getRepos(token) {
  let repos = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    try {
      const response = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}`,
        { headers: { Authorization: `token ${token}` } }
      );
      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`);
      }
      const data = await response.json();
      repos = repos.concat(data);
      hasMore = data.length >= 100;
      page++;
    } catch (error) {
      console.error("Error fetching repositories:", error);
      if (error.message.includes("401")) {
        sessionStorage.removeItem("token");
      }
      hasMore = false;
    }
  }
  return repos;
}

export async function getUserInfo(token) {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${token}` },
    });
    if (!response.ok) {
      throw new Error(`GitHub API responded with status ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}
