export const CLIENT_ID = process.env.APP_CLIENT_ID || "YOUR_CLIENT_ID";

export async function startOAuth() {
  const clientId = CLIENT_ID;
  const redirectUri = "http://localhost:8000/callback";
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;
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
    const response = await fetch("/oauth/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      throw new Error("Failed to fetch access token");
    }
    const data = await response.json();
    const token = data.access_token;
    sessionStorage.setItem("token", token);
    return token;
  } catch (error) {
    console.error("Error during login:", error);
    document.getElementById("error-message").style.display = "block";
  }
}
