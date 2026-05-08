import { getUserInfo, getRepos } from "./github.js";
import {
  handleClickCommits,
  handleClickIssues,
  handleClickIssuesCards,
  handleClickKanban,
  handleClickGantt,
  logout,
} from "./handler.js";

export async function main() {
  const token = localStorage.getItem("github_token");
  const loginSection = document.getElementById("login-section");
  const mainSection = document.getElementById("main-section");

  // Vérifier si les éléments existent
  if (!loginSection || !mainSection) {
    console.error("Éléments HTML manquants");
    return;
  }

  if (!token) {
    loginSection.style.display = "block";
    mainSection.style.display = "none";
    return;
  }

  loginSection.style.display = "none";
  mainSection.style.display = "block";

  const userInfo = await getUserInfo(token);
  const repos = await getRepos(token);

  const container = document.querySelector(".container") || mainSection;
  if (container) {
    const profileContainer = document.createElement("div");
    profileContainer.className = "profile-container";

    if (userInfo) {
      const dropdown = document.createElement("div");
      dropdown.className = "dropdown";
      dropdown.style.order = "1";
      dropdown.style.margin = "0 100px";

      const profileImg = document.createElement("img");
      profileImg.src = userInfo.avatar_url;
      profileImg.alt = `${userInfo.login}'s profile picture`;
      profileImg.style.width = "50px";
      profileImg.style.height = "50px";
      profileImg.style.borderRadius = "50%";
      dropdown.appendChild(profileImg);

      const dropdownContent = document.createElement("div");
      dropdownContent.className = "dropdown-content";

      const logoutLink = document.createElement("a");
      logoutLink.href = "#";
      logoutLink.textContent = "Logout";
      logoutLink.addEventListener("click", logout);
      dropdownContent.appendChild(logoutLink);

      dropdown.appendChild(dropdownContent);
      profileContainer.appendChild(dropdown);
    }

    const select = document.createElement("select");
    select.id = "repo-select";
    repos.forEach((repo) => {
      const option = document.createElement("option");
      option.value = repo.name;
      option.textContent = repo.name;
      select.appendChild(option);
    });
    profileContainer.appendChild(select);

    // Sélecteur de Project v2 (Auto = parcourt tous les projets de l'owner)
    const projectSelect = document.createElement("select");
    projectSelect.id = "project-select";
    projectSelect.title = "GitHub Project pour les dates planifiées";
    projectSelect.innerHTML = `<option value="auto">📋 Project : auto</option>`;
    profileContainer.appendChild(projectSelect);

    async function refreshProjects() {
      const repo = repos.find((r) => r.name === select.value);
      if (!repo) return;
      projectSelect.innerHTML = `<option value="auto">⏳ chargement…</option>`;
      const { listProjectsForOwner } = await import("./github.js");
      const projects = await listProjectsForOwner(token, repo.owner.login);
      projectSelect.innerHTML = `<option value="auto">📋 Auto (tous les projets)</option>`;
      if (!projects.length) {
        const opt = document.createElement("option");
        opt.disabled = true;
        opt.textContent = "Aucun projet trouvé (scope read:project ?)";
        projectSelect.appendChild(opt);
      }
      projects.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `#${p.number} — ${p.title}`;
        projectSelect.appendChild(opt);
      });
    }
    select.addEventListener("change", refreshProjects);
    refreshProjects();

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const buttonCommits = document.createElement("button");
    buttonCommits.textContent = "Create table commits";
    buttonCommits.id = "create-table-commit";
    buttonCommits.addEventListener("click", handleClickCommits(repos, token));
    buttonContainer.appendChild(buttonCommits);

    const buttonIssues = document.createElement("button");
    buttonIssues.textContent = "Create table issues";
    buttonIssues.id = "create-table-issue";
    buttonIssues.addEventListener("click", handleClickIssues(repos, token));
    buttonContainer.appendChild(buttonIssues);

    const buttonStories = document.createElement("button");
    buttonStories.textContent = "User stories";
    buttonStories.id = "create-issues-cards";
    buttonStories.addEventListener("click", handleClickIssuesCards(repos, token));
    buttonContainer.appendChild(buttonStories);

    const buttonKanban = document.createElement("button");
    buttonKanban.textContent = "Kanban";
    buttonKanban.id = "create-kanban";
    buttonKanban.addEventListener("click", handleClickKanban(repos, token));
    buttonContainer.appendChild(buttonKanban);

    const buttonGantt = document.createElement("button");
    buttonGantt.textContent = "Gantt";
    buttonGantt.id = "create-gantt";
    buttonGantt.addEventListener("click", handleClickGantt(repos, token));
    buttonContainer.appendChild(buttonGantt);

    profileContainer.appendChild(buttonContainer);
    container.appendChild(profileContainer);
  }
}

// Attendre que le DOM soit chargé avant d'exécuter main()
document.addEventListener("DOMContentLoaded", main);
