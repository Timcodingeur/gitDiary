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

// ─── GitHub Projects v2 (GraphQL) ──────────────────────────
// Récupère les champs custom (Start date, Target date, milestone, sprint, estimate)
// pour toutes les issues d'un repo, en parcourant les ProjectsV2 de l'owner.
// Retourne une Map<issueNumber, scheduleInfo>.
const PROJECTS_QUERY = `
query($owner: String!, $cursor: String) {
  repositoryOwner(login: $owner) {
    ... on Organization {
      projectsV2(first: 20, after: $cursor) {
        nodes { id number title }
        pageInfo { hasNextPage endCursor }
      }
    }
    ... on User {
      projectsV2(first: 20, after: $cursor) {
        nodes { id number title }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

const PROJECT_ITEMS_QUERY = `
query($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          fieldValues(first: 20) {
            nodes {
              __typename
              ... on ProjectV2ItemFieldDateValue {
                date
                field { ... on ProjectV2Field { name } }
              }
              ... on ProjectV2ItemFieldNumberValue {
                number
                field { ... on ProjectV2Field { name } }
              }
              ... on ProjectV2ItemFieldIterationValue {
                title startDate duration
                field { ... on ProjectV2IterationField { name } }
              }
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
            }
          }
          content {
            __typename
            ... on Issue {
              number
              repository { name owner { login } }
            }
          }
        }
      }
    }
  }
}`;

async function gqlRequest(token, query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

function pickField(fieldValues, names) {
  const wanted = names.map((n) => n.toLowerCase());
  for (const fv of fieldValues || []) {
    const fname = (fv.field?.name || "").toLowerCase();
    if (wanted.includes(fname)) return fv;
  }
  return null;
}

export async function getProjectSchedules(token, owner, repo) {
  const map = new Map(); // issueNumber → { start, end, sprint, estimate, source }
  try {
    // Lister tous les projets de l'owner
    let cursor = null;
    const projects = [];
    while (true) {
      const data = await gqlRequest(token, PROJECTS_QUERY, { owner, cursor });
      const owner_ = data.repositoryOwner;
      if (!owner_ || !owner_.projectsV2) break;
      projects.push(...owner_.projectsV2.nodes);
      if (!owner_.projectsV2.pageInfo.hasNextPage) break;
      cursor = owner_.projectsV2.pageInfo.endCursor;
    }

    // Pour chaque projet, parcourir les items et conserver ceux du repo
    for (const proj of projects) {
      let c = null;
      while (true) {
        const data = await gqlRequest(token, PROJECT_ITEMS_QUERY, { projectId: proj.id, cursor: c });
        const items = data?.node?.items?.nodes || [];
        for (const item of items) {
          const issue = item.content;
          if (!issue || issue.__typename !== "Issue") continue;
          if (issue.repository?.name !== repo) continue;
          if ((issue.repository?.owner?.login || "").toLowerCase() !== owner.toLowerCase()) continue;

          const fvs = item.fieldValues?.nodes || [];
          const startFv = pickField(fvs, ["start date", "start", "début", "date de début", "startdate"]);
          const endFv = pickField(fvs, ["target date", "end date", "end", "due date", "fin", "date de fin", "deadline", "target", "enddate"]);
          const iterFv = pickField(fvs, ["sprint", "iteration", "itération"]);
          const estFv = pickField(fvs, ["estimate", "estimation", "heures", "hours", "story points"]);

          let start = startFv?.date || null;
          let end = endFv?.date || null;

          // Itération → fournit start + durée
          if (iterFv?.startDate) {
            if (!start) start = iterFv.startDate;
            if (!end) {
              const sd = new Date(iterFv.startDate);
              sd.setDate(sd.getDate() + (iterFv.duration || 14));
              end = sd.toISOString().slice(0, 10);
            }
          }

          if (!start && !end) continue;

          map.set(issue.number, {
            start,
            end,
            sprint: iterFv?.title || null,
            estimate: estFv?.number ?? null,
            source: `project:${proj.title}`,
          });
        }
        if (!data?.node?.items?.pageInfo?.hasNextPage) break;
        c = data.node.items.pageInfo.endCursor;
      }
    }
  } catch (err) {
    console.warn("[ProjectsV2] récupération impossible :", err.message);
    // Le scope read:project peut manquer — on continue sans planning custom.
  }
  return map;
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
