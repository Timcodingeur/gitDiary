import { default as initializeApp } from './main.js';

const API = {
    BASE_URL: 'https://api.gitdiary.ch',
    GITHUB_API: 'https://api.github.com',

    async getCommits(owner, repo) {
        const token = localStorage.getItem('github_token');
        const response = await fetch(`${this.GITHUB_API}/repos/${owner}/${repo}/commits`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return await response.json();
    },

    async getUserRepos() {
        const token = localStorage.getItem('github_token');
        const response = await fetch(`${this.GITHUB_API}/user/repos`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return await response.json();
    },

    async addTime(hash, time) {
        const response = await fetch(`${this.BASE_URL}/add-time`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ hash, time })
        });
        return await response.json();
    },

    async getTimeForCommit(hash) {
        const response = await fetch(`${this.BASE_URL}/time/${hash}`);
        return await response.json();
    }
};

// Initialize function to check auth status
async function initializeAuth() {
    const token = localStorage.getItem('github_token');
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (token) {
        // Already authenticated
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        // Initialize main app if we have a token
        await initializeApp();
        return;
    }
    
    if (code) {
        try {
            const response = await fetch('https://api.gitdiary.ch/oauth/github', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                throw new Error('Failed to exchange code for token');
            }

            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem('github_token', data.access_token);
                // Clear the URL without refreshing the page
                window.history.replaceState({}, document.title, '/app/frontend/public/');
                // Show main section
                document.getElementById('login-section').style.display = 'none';
                document.getElementById('main-section').style.display = 'block';
                // Initialize the main app
                await initializeApp();
            }
        } catch (error) {
            console.error('Authentication error:', error);
        }
    }
}

export async function startOAuth() {
    const clientId = 'Ov23li1L2rvL4GwFN9tQ';
    const redirectUri = 'https://api.gitdiary.ch/callback';
    const scope = 'repo';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = authUrl;
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', initializeAuth);