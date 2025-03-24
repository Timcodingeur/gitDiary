import dotenv from "dotenv";

dotenv.config();

// Configuration selon l'environnement
const config = {
  development: {
    frontendUrl: "http://127.0.0.1:5500/app/frontend/public",
    apiUrl: "http://localhost:8000",
  },
  test: {
    frontendUrl: "http://127.0.0.1:5500/app/frontend/public",
    apiUrl: "http://localhost:8000",
  },
  production: {
    frontendUrl: "https://gitdiary.ch",
    apiUrl: "https://api.gitdiary.ch",
  },
};

const env = process.env.NODE_ENV || "production";
const currentConfig = config[env];

const API = {
  BASE_URL: "https://api.gitdiary.ch",
  GITHUB_API: "https://api.github.com",

  async getCommits(owner, repo) {
    const token = localStorage.getItem("github_token");
    const response = await fetch(
      `${this.GITHUB_API}/repos/${owner}/${repo}/commits`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    return await response.json();
  },

  async getUserRepos() {
    const token = localStorage.getItem("github_token");
    const response = await fetch(`${this.GITHUB_API}/user/repos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return await response.json();
  },

  async addTime(hash, time) {
    const response = await fetch(`${this.BASE_URL}/add-time`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hash, time }),
    });
    return await response.json();
  },

  async getTimeForCommit(hash) {
    const response = await fetch(`${this.BASE_URL}/time/${hash}`);
    return await response.json();
  },
};

export async function startOAuth() {
  const clientId = "Ov23li1L2rvL4GwFN9tQ";
  const redirectUri = `${currentConfig.apiUrl}/callback`;
  const scope = "repo";
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  window.location.href = authUrl;
}

export async function login() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get("code");

  if (!code) {
    startOAuth();
    return;
  }

  try {
    const response = await fetch(`${currentConfig.apiUrl}/oauth/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch access token");
    }

    const data = await response.json();
    const token = data.access_token;
    localStorage.setItem("github_token", token);
    window.location.href = "/";
  } catch (error) {
    console.error("Error during login:", error);
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.style.display = "block";
      errorMessage.textContent = `Erreur d'authentification: ${error.message}`;
    }
  }
}

// Initialize auth on page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const token = localStorage.getItem("github_token");
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (token) {
      const mainSection = document.getElementById("main-section");
      const loginSection = document.getElementById("login-section");

      if (mainSection) mainSection.style.display = "block";
      if (loginSection) loginSection.style.display = "none";
      return;
    }

    if (code) {
      await login();
    }
  } catch (error) {
    console.error("Authentication error:", error);
    const errorMessage = document.getElementById("error-message");
    if (errorMessage) {
      errorMessage.textContent = `Erreur d'authentification: ${error.message}`;
      errorMessage.style.display = "block";
    }
  }
});
