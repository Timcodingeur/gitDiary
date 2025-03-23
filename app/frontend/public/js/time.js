const API_URL = 'https://api.gitdiary.ch';

export async function addTimeToTheDatbase(hash, time) {
  try {
    const response = await fetch(`${API_URL}/add-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash, time }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log("Time spent added to the database.");
  } catch (error) {
    console.error("Error adding time to the database:", error);
    throw error;
  }
}

export function handleClickCommit(td) {
  const time = prompt("Enter the time spent on this task (in minutes):");
  if (!time) return; // Si l'utilisateur annule

  const numTime = parseInt(time, 10);
  if (isNaN(numTime) || numTime < 0) {
    alert("Please enter a valid positive number");
    return;
  }

  const hour = Math.floor(numTime / 60);
  const minute = numTime % 60;
  td.textContent = `${hour}h ${minute} min`;
  
  // Récupérer le hash du commit
  const hash = td.parentElement.querySelector("#commit-hash").textContent;
  console.log('Adding time for commit:', hash);
  
  addTimeToTheDatbase(hash, numTime).catch(error => {
    console.error('Error adding time:', error);
    td.textContent = "Error saving time";
  });
}

export function formatDuration(duration) {
  const days = Math.floor(duration / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);
  return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}

export async function getSumCommitsTime(commits) {
  let minutes = 0;
  for (const commit of commits) {
    const response = await fetch(
      `${API_URL}/get-time/${commit.sha}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await response.json();
    minutes += Number(data[0]?.time) || 0;
  }
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour}h ${minute} min`;
}