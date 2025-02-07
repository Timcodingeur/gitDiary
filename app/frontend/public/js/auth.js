const API = {
    BASE_URL: 'http://localhost:3000',
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