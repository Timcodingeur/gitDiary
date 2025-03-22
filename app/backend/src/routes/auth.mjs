import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';

dotenv.config();

const router = express.Router();

router.post('/oauth/github', async (req, res) => {
  const { code } = req.body;
  
  // Add this validation
  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  // Add this validation
  if (!process.env.APP_CLIENT_ID || !process.env.APP_CLIENT_SECRET) {
    return res.status(500).json({ error: "GitHub OAuth credentials are undefined" });
  }
  
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.APP_CLIENT_ID,
        client_secret: process.env.APP_CLIENT_SECRET,
        code,
      }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Failed to authenticate with GitHub' });
  }
});

router.get('/callback', (req, res) => {
  const code = req.query.code;
  // Redirect to the correct frontend path
  res.redirect(`http://127.0.0.1:5500/app/frontend/public/?code=${code}`);
});

export default router;

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
