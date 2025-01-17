import { CLIENT_ID } from './env.js';

async function addTimeToTheDatbase(hash, time) {
    const response = await fetch('http://localhost:8000/add-time', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hash, time }),
    });

    if (!response.ok) {
        console.error('Error adding time to the database:', response.statusText);
    } else {
        console.log('Time spent added to the database.');
    }
}

function handleClickCommit(td) {
    const time = prompt('Enter the time spent on this task (in minutes):');
    const hour = Math.floor(time / 60);
    const minute = time % 60;
    td.textContent = `${hour}h ${minute} min`;

    addTimeToTheDatbase(td.parentElement.firstChild.textContent, time);
}

function formatDuration(duration) {
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}

function createIssuesTable(issues) {
    const container = document.querySelector('.container');
    if (container) {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const tr = document.createElement('tr');
        const th1 = document.createElement('th');
        th1.id = "number"
        const th2 = document.createElement('th');
        th2.id = "title"
        const th3 = document.createElement('th');
        th3.id = "author"
        const th4 = document.createElement('th');
        th4.id = "state"
        const th5 = document.createElement('th');
        th5.id = "start-date"
        const th6 = document.createElement('th');
        th6.id = "end-date"
        const th7 = document.createElement('th');
        th7.id = "duration"
        th1.textContent = 'Issue Number';
        th2.textContent = 'Title';
        th3.textContent = 'Author';
        th4.textContent = 'State';
        th5.textContent = 'Start Date';
        th6.textContent = 'End Date';
        th7.textContent = 'Duration';
        tr.appendChild(th1);
        tr.appendChild(th2);
        tr.appendChild(th3);
        tr.appendChild(th4);
        tr.appendChild(th5);
        tr.appendChild(th6);
        tr.appendChild(th7);
        thead.appendChild(tr);
        table.appendChild(thead);

        for (const issue of issues) {
            const tr = document.createElement('tr');
            tr.id = "issue-content"
            const td1 = document.createElement('td');
            td1.id = "issue-number"
            const td2 = document.createElement('td');
            td2.id = "issues-title"
            const td3 = document.createElement('td');
            td3.id = "issue-author"
            const td4 = document.createElement('td');
            td4.id = "issue-state"
            const td5 = document.createElement('td');
            td5.id = "issue-start-date"
            const td6 = document.createElement('td');
            td6.id = "issue-end-date"
            const td7 = document.createElement('td');
            td7.id = "issue-duration"
            td7.addEventListener('click', () => handleClickCommit(td7));
            td1.textContent = issue.number;
            td2.textContent = issue.title;
            td3.textContent = issue.user.login;
            td4.textContent = issue.state;
            td5.textContent = new Date(issue.created_at).toLocaleString();
            td6.textContent = issue.closed_at ? new Date(issue.closed_at).toLocaleString() : 'N/A';
            td7.textContent = issue.closed_at ? formatDuration(new Date(issue.closed_at) - new Date(issue.created_at)) : 'N/A';
            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);
            tr.appendChild(td5);
            tr.appendChild(td6);
            tr.appendChild(td7);
            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        container.appendChild(table);
    }
}

async function getIssues(token, owner, repo) {
    let issues = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`,
                {
                    headers: {
                        Authorization: `token ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API responded with status ${response.status}`);
            }

            const data = await response.json();
            issues = issues.concat(data);
            if (data.length < 100) {
                hasMore = false;
            } else {
                page++;
            }
        } catch (error) {
            console.error('Error fetching issues:', error);
            hasMore = false; // Stop the loop if an error occurs
        }
    }
    return issues;
}

async function createTableFactice() {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const tr = document.createElement('tr');
    const th1 = document.createElement('th');
    const th2 = document.createElement('th');
    const th3 = document.createElement('th');
    const th4 = document.createElement('th');
    const th5 = document.createElement('th');
    th1.textContent = 'Hash';
    th2.textContent = 'Author';
    th3.textContent = 'Date';
    th4.textContent = 'Message';
    th5.textContent = 'Duration';
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    tr.appendChild(th4);
    tr.appendChild(th5);
    thead.appendChild(tr);
    table.appendChild(thead);

    const divs = document.querySelectorAll('.day-commits');
    divs.forEach((div, index) => {
        const rows = div.querySelectorAll('table tbody tr');
        rows.forEach((row) => {
            const tr = document.createElement('tr');
            row.querySelectorAll('td').forEach((td) => {
                const tdClone = td.cloneNode(true);
                tr.appendChild(tdClone);
            });
            tbody.appendChild(tr);
        });

        // Ajouter une ligne blanche après chaque div sauf le dernier
        if (index < divs.length - 1) {
            const emptyTr = document.createElement('tr');
            const emptyTd = document.createElement('td');
            emptyTd.colSpan = 5; // Assurez-vous que cela correspond au nombre de colonnes
            emptyTd.innerHTML = '&nbsp;';
            emptyTr.appendChild(emptyTd);
            tbody.appendChild(emptyTr);
        }
    });

    table.appendChild(tbody);
    return table;
}

async function exportToPdf() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const divs = document.querySelectorAll('.day-commits');

    const table = divs.length == 0 ? document.querySelector("table") : await createTableFactice();
    pdf.autoTable({ html: table });

    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = divs.length == 0 ? 'issues.pdf' : 'commits.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportToMarkdown() {
    const divs = document.querySelectorAll('.day-commits');
    const table = divs.length == 0 ? document.querySelector("table") : await createTableFactice();
    const heads = table.querySelectorAll('thead');
    const rows = table.querySelectorAll('tr');
    let markdown = '';
    for (const head of heads) {
        markdown += '| ';
        head.querySelectorAll('th').forEach((th) => {
            markdown += `${th.textContent} | `;
        });
        markdown = markdown.slice(0, -3);
        markdown += '\n';
    }
    for (const head of heads) {
        markdown += '| ';
        head.querySelectorAll('th').forEach((th) => {
            markdown += `--- | `;
        });
        markdown = markdown.slice(0, -3);
        markdown += '\n';
    }
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        markdown += '| ';
        for (const cell of cells) {
            markdown += `${cell.textContent} | `;
        }
        markdown = markdown.slice(0, -3);
        markdown += '\n';
    }

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = divs.length == 0 ? 'issues.md' : 'commits.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportToCsv() {
    const divs = document.querySelectorAll('.day-commits');
    const table = divs.length == 0 ? document.querySelector("table") : await createTableFactice();
    const heads = table.querySelectorAll('thead');
    const rows = table.querySelectorAll('tr');
    let csv = '';

    for (const head of heads) {
        head.querySelectorAll('th').forEach((th) => {
            csv += `${th.textContent},`;
        });
        csv = csv.slice(0, -1);
        csv += '\n';
    }

    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell) => {
            csv += `${cell.textContent},`;
        });
        csv = csv.slice(0, -1);
        csv += '\n';
    }


    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = divs.length == 0 ? 'issues.csv' : 'commits.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function startOAuth() {
    const clientId = CLIENT_ID;
    const redirectUri = 'http://localhost:8000/callback';

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;
    window.location.href = authUrl;
}

async function login() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
        startOAuth();
        return;
    }

    try {
        const response = await fetch('/oauth/github', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch access token');
        }

        const data = await response.json();
        const token = data.access_token;
        sessionStorage.setItem('token', token);
        return token;
    } catch (error) {
        console.error('Error during login:', error);
        document.getElementById('error-message').style.display = 'block';
    }
}

async function getRepos(token) {
    let repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        try {
            const response = await fetch(
                `https://api.github.com/user/repos?per_page=100&page=${page}`,
                {
                    headers: {
                        Authorization: `token ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API responded with status ${response.status}`);
            }

            const data = await response.json();
            repos = repos.concat(data);
            if (data.length < 100) {
                hasMore = false;
            } else {
                page++;
            }
        } catch (error) {
            console.error('Error fetching repositories:', error);
            if (error.message.includes('401')) {
                sessionStorage.removeItem('token');
                startOAuth();
            }
            hasMore = false; // Stop the loop if an error occurs
        }
    }
    return repos;
}

async function getSumCommitsTime(commits) {
    let minutes = 0;
    for(const commit of commits) {
        const response = await fetch('http://localhost:8000/get-time/' + commit.sha, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        const data = await response.json();
        minutes += Number(data[0]?.time) || 0;
    }
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour}h ${minute} min`;
}

async function createTable(commits) {
    const container = document.querySelector('.container');
    if (container) {
        const groupedCommits = groupCommitsByDate(commits);
        for (const [date, dailyCommits] of Object.entries(groupedCommits)) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-commits';
            const dateHeader = document.createElement('h2');
            dateHeader.textContent = date;
            dayDiv.appendChild(dateHeader);

            const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');
            const tr = document.createElement('tr');
            const th1 = document.createElement('th');
            const th2 = document.createElement('th');
            const th3 = document.createElement('th');
            const th4 = document.createElement('th');
            const th5 = document.createElement('th');
            th1.textContent = 'Hash';
            th1.id = 'hash';
            th2.textContent = 'Author';
            th2.id = 'author';
            th3.textContent = 'Date';
            th3.id = 'date';
            th4.textContent = 'Message';
            th4.id = 'message';
            th5.textContent = 'Duration';
            th5.id = 'duration';
            tr.appendChild(th1);
            tr.appendChild(th2);
            tr.appendChild(th3);
            tr.appendChild(th4);
            tr.appendChild(th5);
            thead.appendChild(tr);
            table.appendChild(thead);

            for (const commit of dailyCommits) {
                const response = await fetch('http://localhost:8000/get-time/' + commit.sha, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const minutes = data[0]?.time || '';
                let time = '';
                if(minutes !== '') {
                    const hour = Math.floor(minutes / 60);
                    const minute = minutes % 60;
                    time = `${hour}h ${minute} min`;
                }
                const row = document.createElement('tr');
                row.id = "commit-content"
                const td1 = document.createElement('td');
                td1.id = "commit-hash"
                const td2 = document.createElement('td');
                td2.id = "commit-author"
                const td3 = document.createElement('td');
                td3.id = "commit-date"
                const td4 = document.createElement('td');
                td4.id = "commit-message"
                const td5 = document.createElement('td');
                td5.id = "commit-duration"
                td5.addEventListener('click', () => handleClickCommit(td5));
                td1.textContent = commit.sha;
                td2.textContent = commit.commit.author.name;
                td3.textContent = new Date(commit.commit.author.date).toLocaleString();
                td4.textContent = commit.commit.message;
                td5.textContent = time;
                row.appendChild(td1);
                row.appendChild(td2);
                row.appendChild(td3);
                row.appendChild(td4);
                row.appendChild(td5);
                tbody.appendChild(row);
            }

            const row = document.createElement('tr');
            row.id = "day-total-time"
            const td1 = document.createElement('td');
            td1.id = "day-total"
            const td2 = document.createElement('td');
            const td3 = document.createElement('td');
            const td4 = document.createElement('td');
            const td5 = document.createElement('td');
            td5.id = "day-total-duration"
            td1.textContent = 'Total';
            td5.textContent = await getSumCommitsTime(dailyCommits);
            row.appendChild(td1);
            row.appendChild(td2);
            row.appendChild(td3);
            row.appendChild(td4);
            row.appendChild(td5);
            tbody.appendChild(row);

            table.appendChild(tbody);
            dayDiv.appendChild(table);
            container.appendChild(dayDiv);
        }
    }
}

async function getCommits(token, owner, repo) {
    let commits = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${page}`,
            {
                headers: {
                    Authorization: `token ${token}`,
                },
            }
        );
        const data = await response.json();
        commits = commits.concat(data);
        if (data.length < 100) {
            hasMore = false;
        } else {
            page++;
        }
    }

    return commits;
}

function groupCommitsByDate(commits) {
    const grouped = {};
    commits.forEach((commit) => {
        const date = new Date(commit.commit.author.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(commit);
    });
    return grouped;
}

async function getUserInfo(token) {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `token ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching user info:', error);
        return null;
    }
}

function handleClickCommits(repos, token) {
    return async function() {
        const container = document.querySelector('.container');
        const profileContainer = document.querySelector('.profile-container');
        if (!container) return;

        // Nettoyage des anciens tableaux et boutons export
        document.querySelectorAll('table').forEach((table) => table.remove());
        document.querySelectorAll('.day-commits').forEach((dayDiv) => dayDiv.remove());
        document.querySelectorAll('button').forEach((button) => {
            if (
                button.textContent !== 'Create table commits' &&
                button.textContent !== 'Create table issues'
            ) {
                button.remove();
            }
        });

        // Création des nouveaux boutons d’export
        const exportButtonPdf = document.createElement('button');
        exportButtonPdf.textContent = 'Export to PDF';
        exportButtonPdf.id = "export-pdf"
        exportButtonPdf.addEventListener('click', exportToPdf);
        profileContainer.appendChild(exportButtonPdf);

        const exportButtonMd = document.createElement('button');
        exportButtonMd.textContent = 'Export to Markdown';
        exportButtonMd.id = "export-md"
        exportButtonMd.addEventListener('click', exportToMarkdown);
        profileContainer.appendChild(exportButtonMd);

        const exportButtonCsv = document.createElement('button');
        exportButtonCsv.textContent = 'Export to CSV';
        exportButtonCsv.id = "export-csv"
        exportButtonCsv.addEventListener('click', exportToCsv);
        profileContainer.appendChild(exportButtonCsv);

        // Récupération des commits
        const select = document.querySelector('select');
        const repoName = select.value;
        const repo = repos.find((r) => r.name === repoName);
        const commits = await getCommits(token, repo.owner.login, repo.name);
        createTable(commits);
    };
}

function handleClickIssues(repos, token) {
    return async function() {
        const container = document.querySelector('.container');
        const profileContainer = document.querySelector('.profile-container');
        if (!container) return;

        // Nettoyage des anciens tableaux et boutons export
        document.querySelectorAll('table').forEach((table) => table.remove());
        document.querySelectorAll('.day-commits').forEach((dayDiv) => dayDiv.remove());
        document.querySelectorAll('button').forEach((button) => {
            if (
                button.textContent !== 'Create table commits' &&
                button.textContent !== 'Create table issues'
            ) {
                button.remove();
            }
        });

        // Création des nouveaux boutons d’export
        const exportButtonPdf = document.createElement('button');
        exportButtonPdf.textContent = 'Export to PDF';
        exportButtonPdf.id = "export-pdf"
        exportButtonPdf.addEventListener('click', exportToPdf);
        profileContainer.appendChild(exportButtonPdf);

        const exportButtonMd = document.createElement('button');
        exportButtonMd.textContent = 'Export to Markdown';
        exportButtonMd.id = "export-md"
        exportButtonMd.addEventListener('click', exportToMarkdown);
        profileContainer.appendChild(exportButtonMd);

        const exportButtonCsv = document.createElement('button');
        exportButtonCsv.textContent = 'Export to CSV';
        exportButtonCsv.id = "export-csv"
        exportButtonCsv.addEventListener('click', exportToCsv);
        profileContainer.appendChild(exportButtonCsv);

        // Récupération des issues
        const select = document.querySelector('select');
        const repoName = select.value;
        const repo = repos.find((r) => r.name === repoName);
        const issues = await getIssues(token, repo.owner.login, repo.name);
        createIssuesTable(issues);
    };
}

async function logout() {
    sessionStorage.removeItem('token');
    window.location.reload();
}

async function main() {
    const token = sessionStorage.getItem('token') || (await login());

    // Si pas de token, on affiche la zone de login et on quitte
    if (!token) {
        document.getElementById('login-container').style.display = 'block';
        return;
    }

    // Sinon, on cache la zone de login
    document.getElementById('login-container').style.display = 'none';

    // Récupération de l’utilisateur et de ses repos
    const userInfo = await getUserInfo(token);
    const repos = await getRepos(token);

    // Construction de l’interface
    const container = document.querySelector('.container');
    if (container) {
        const profileContainer = document.createElement('div');
        profileContainer.className = 'profile-container';

        if (userInfo) {
            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown';
            dropdown.style.order = 1
            dropdown.style.margin = '0 100px';

            const profileImg = document.createElement('img');
            profileImg.src = userInfo.avatar_url;
            profileImg.alt = `${userInfo.login}'s profile picture`;
            profileImg.style.width = '50px';
            profileImg.style.height = '50px';
            profileImg.style.borderRadius = '50%';
            dropdown.appendChild(profileImg);

            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'dropdown-content';

            const logoutLink = document.createElement('a');
            logoutLink.href = '#';
            logoutLink.textContent = 'Logout';
            logoutLink.addEventListener('click', logout);
            dropdownContent.appendChild(logoutLink);

            dropdown.appendChild(dropdownContent);
            profileContainer.appendChild(dropdown);
        }

        const select = document.createElement('select');
        for (const repo of repos) {
            const option = document.createElement('option');
            option.value = repo.name;
            option.textContent = repo.name;
            select.appendChild(option);
        }
        profileContainer.appendChild(select);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';

        const buttonCommits = document.createElement('button');
        buttonCommits.textContent = 'Create table commits';
        buttonCommits.id = "create-table-commit"
        buttonCommits.addEventListener('click', handleClickCommits(repos, token));
        buttonContainer.appendChild(buttonCommits);

        const buttonIssues = document.createElement('button');
        buttonIssues.textContent = 'Create table issues';
        buttonIssues.id = "create-table-issue"
        buttonIssues.addEventListener('click', handleClickIssues(repos, token));
        buttonContainer.appendChild(buttonIssues);

        profileContainer.appendChild(buttonContainer);
        container.appendChild(profileContainer);
    }
}

document.getElementById('login-button').addEventListener('click', startOAuth);

main();
