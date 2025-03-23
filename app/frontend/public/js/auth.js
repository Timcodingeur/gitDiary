// Remove the default import since main.js doesn't have a default export
// import { default as initializeApp } from './main.js';

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
  console.log('Initialisation de l\'authentification...');
  try {
    const token = localStorage.getItem('github_token');
    console.log('Token existe:', !!token);
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    console.log('Code reçu:', !!code);
    
    if (token) {
      console.log('Token trouvé, affichage de la section principale');
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('main-section').style.display = 'block';
      
      // Import et exécution de main
      try {
        const { main } = await import('./main.js');
        console.log('Module main.js chargé');
        await main();
      } catch (importError) {
        console.error('Erreur lors du chargement de main.js:', importError);
        throw importError;
      }
      return;
    }
    
    if (code) {
      console.log('Échange du code contre un token...');
      const response = await fetch('https://api.gitdiary.ch/oauth/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exchange code for token');
      }

      const data = await response.json();
      console.log('Réponse reçue de l\'API');
      
      if (data.access_token) {
        console.log('Token reçu, sauvegarde...');
        localStorage.setItem('github_token', data.access_token);
        window.history.replaceState({}, document.title, '/');
        
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('main-section').style.display = 'block';
        
        // Import et exécution de main après l'obtention du token
        const { main } = await import('./main.js');
        await main();
      } else {
        throw new Error('No access token received');
      }
    }
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    document.getElementById('error-message').textContent = 
      `Erreur d'authentification: ${error.message}`;
    document.getElementById('error-message').style.display = 'block';
  }
}

export async function startOAuth() {
    const clientId = 'Ov23li1L2rvL4GwFN9tQ';
    const redirectUri = 'https://api.gitdiary.ch/callback';
    const scope = 'repo';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = authUrl;
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', initializeAuth);