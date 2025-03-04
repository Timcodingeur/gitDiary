import { getUserInfo, getRepos } from "./github.js";
import { handleClickCommits, handleClickIssues, logout } from "./handler.js";

async function main() {
  const token = localStorage.getItem("github_token");
  if (!token) {
    document.getElementById("login-section").style.display = "block";
    document.getElementById("main-section").style.display = "none";
    return;
  }
  document.getElementById("login-section").style.display = "none";
  document.getElementById("main-section").style.display = "block";

  const userInfo = await getUserInfo(token);
  const repos = await getRepos(token);

  const container = document.querySelector(".container") || document.getElementById("main-section");
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
    repos.forEach((repo) => {
      const option = document.createElement("option");
      option.value = repo.name;
      option.textContent = repo.name;
      select.appendChild(option);
    });
    profileContainer.appendChild(select);

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

    profileContainer.appendChild(buttonContainer);
    container.appendChild(profileContainer);
  }
}

main();