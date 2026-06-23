// ===============================
// CONFIG
// ===============================
const USER_ID = "1360925264669966338";
const API_URL = `https://jester-presence-api.onrender.com/api/presence?user=${USER_ID}&nocache=`;

// Track last states
let lastTrackId = null;
let lastXboxState = null;
let gameTimerInterval = null;

// ===============================
// GAME LOGO DATABASE
// ===============================
const GAME_LOGOS = {
  "Fortnite": "https://i.imgur.com/0ZQ9Q0X.png",
  "Apex Legends": "https://i.imgur.com/7x0yY8M.png",
  "Grand Theft Auto V": "https://i.imgur.com/8e4Q0mX.png",
  "Minecraft": "https://i.imgur.com/8n4z0Qp.png",
  "Call of Duty": "https://i.imgur.com/4yQ0m0P.png",
  "Valorant": "https://i.imgur.com/1Q0m8yX.png",
  "Rocket League": "https://i.imgur.com/5Q0m8yX.png",
  "Roblox": "https://i.imgur.com/6Q0m8yX.png"
};

// ===============================
// GAME LOGO RESOLVER
// ===============================
function getGameLogo(gameName, activity) {
  if (!gameName) return "https://i.imgur.com/8QfQFfC.png";

  if (GAME_LOGOS[gameName]) return GAME_LOGOS[gameName];

  const key = Object.keys(GAME_LOGOS).find(k =>
    gameName.toLowerCase().includes(k.toLowerCase())
  );
  if (key) return GAME_LOGOS[key];

  if (activity.applicationId?.startsWith("xbox"))
    return "https://i.imgur.com/1uXKp8y.png";

  if (activity.applicationId?.startsWith("ps"))
    return "https://i.imgur.com/3j1Yx0X.png";

  return "https://i.imgur.com/8QfQFfC.png";
}

// ===============================
// LOGGING
// ===============================
function logLine(text) {
  const log = document.getElementById("log-output");
  if (!log) return;

  const span = document.createElement("span");
  span.className = "log-line";
  span.textContent = text;

  log.appendChild(span);
  while (log.children.length > 5) log.removeChild(log.firstChild);
}

// ===============================
// FETCH PRESENCE
// ===============================
async function fetchPresenceLazy() {
  let res = await fetch(API_URL + Date.now(), { cache: "no-store" });
  let json = await res.json();

  if (!json.presence) {
    logLine("[API] Waiting for worker...");
    await new Promise(r => setTimeout(r, 1200));

    res = await fetch(API_URL + Date.now(), { cache: "no-store" });
    json = await res.json();
  }

  return json.presence || null;
}

async function fetchPresence() {
  try {
    const p = await fetchPresenceLazy();

    if (!p) {
      logLine("[API] No presence data");
      return;
    }

    updateDiscord(p);
    updateSpotify(p.spotify);
    updateXbox(p.xbox || p.game || null);

    logLine("[API] Presence updated");

  } catch (err) {
    logLine("[API] Fetch error");
  }
}

setInterval(fetchPresence, 5000);
fetchPresence();

// ===============================
// DISCORD PANEL
// ===============================
function updateDiscord(p) {
  const statusMap = {
    online: { color: "#43b581", text: "Online" },
    idle: { color: "#faa61a", text: "Idle" },
    dnd: { color: "#f04747", text: "Do Not Disturb" },
    offline: { color: "#747f8d", text: "Offline" }
  };

  const s = statusMap[p.status] || statusMap.offline;

  document.getElementById("dp-status-dot").style.background = s.color;
  document.getElementById("dp-status-text").textContent = s.text;
  document.getElementById("dp-custom-status").textContent = p.customStatus || "No custom status";
  document.getElementById("dp-avatar").src = p.avatar;
  document.getElementById("dp-username").textContent = p.username;
}

// ===============================
// SPOTIFY PANEL
// ===============================
function updateSpotify(spotify) {
  const cover = document.getElementById("spotify-cover");
  const title = document.getElementById("spotify-title");
  const artist = document.getElementById("spotify-artist");
  const panel = document.querySelector(".panel-spotify");

  if (!spotify) {
    panel.classList.remove("active");
    return;
  }

  const albumArt = spotify.assets?.largeImage
    ? `https://i.scdn.co/image/${spotify.assets.largeImage.replace("spotify:", "")}`
    : "https://i.imgur.com/8QfQFfC.png";

  cover.src = albumArt;
  title.textContent = spotify.details;
  artist.textContent = spotify.state;

  panel.classList.add("active");
}

// ===============================
// GAME PANEL (FINAL VERSION)
// ===============================
function updateXbox(activity) {
  const cover = document.getElementById("xbox-cover");
  const title = document.getElementById("xbox-title");
  const details = document.getElementById("xbox-details");
  const panel = document.querySelector(".panel-xbox");
  const icon = document.getElementById("xbox-icon");
  const timePlayed = document.getElementById("xbox-time");

  if (!activity) {
    panel.classList.remove("active");
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    return;
  }

  const game = activity.name;
  const state = activity.details || activity.state || "";
  const coverUrl = activity.cover || "https://i.imgur.com/8QfQFfC.png";

  const stateKey = game + state;
  if (stateKey === lastXboxState) return;

  // 🎮 REAL GAME LOGO OR CONSOLE FALLBACK
  icon.src = getGameLogo(game, activity);

  // ⏱️ TIME PLAYED
  if (gameTimerInterval) clearInterval(gameTimerInterval);

  const start = activity.timestamps?.start
    ? new Date(activity.timestamps.start)
    : null;

  if (start) {
    gameTimerInterval = setInterval(() => {
      const now = new Date();
      const diff = now - start;

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      timePlayed.textContent = `${mins}m ${secs}s`;
    }, 1000);
  }

  title.textContent = game;
  details.textContent = state;
  cover.src = coverUrl;

  panel.classList.add("active");
  lastXboxState = stateKey;

  logLine(`[Game] ${game}`);
}

// ===============================
// BLOOD RUSH MUSIC CONTROLLER
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("music-unlock");
  const audio = document.getElementById("bg-audio");

  if (!btn || !audio) return;

  audio.muted = true;

  btn.addEventListener("click", async () => {
    try {
      if (audio.paused || audio.muted) {
        audio.muted = false;
        await audio.play();
        btn.textContent = "MUTE BLOOD RUSH";
      } else {
        audio.pause();
        audio.muted = true;
        btn.textContent = "UNMUTE BLOOD RUSH";
      }
    } catch (err) {
      console.error("[BloodRush] Play blocked:", err);
    }
  });
});
