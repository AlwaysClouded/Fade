// ===============================
// CONFIG
// ===============================
const USER_ID = "1360925264669966338";
const API_URL = `https://jester-presence-api.onrender.com/api/presence?user=${USER_ID}&nocache=`;

// Trackers
let lastTrackId = null;
let spotifyInterval = null;
let activityTimerInterval = null;
let lastActivityKey = null;

// ===============================
// GAME LOGOS
// ===============================
const GAME_LOGOS = {
  fortnite: "https://i.imgur.com/0ZQ9Q0X.png",
  apex: "https://i.imgur.com/7x0yY8M.png",
  minecraft: "https://i.imgur.com/8n4z0Qp.png",
  roblox: "https://i.imgur.com/6Q0m8yX.png",
  valorant: "https://i.imgur.com/1Q0m8yX.png",
  gta: "https://i.imgur.com/8e4Q0mX.png",
  "call of duty": "https://i.imgur.com/4yQ0m0P.png",
  "rocket league": "https://i.imgur.com/5Q0m8yX.png"
};

function getGameLogo(activity) {
  if (!activity || !activity.name) return "https://i.imgur.com/8QfQFfC.png";

  const name = activity.name.toLowerCase();

  for (const key in GAME_LOGOS) {
    if (name.includes(key)) return GAME_LOGOS[key];
  }

  // Xbox fallback
  if (activity.flags === 1) return "https://i.imgur.com/1uXKp8y.png";

  // PlayStation fallback
  if (name.includes("ps") || name.includes("playstation"))
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
    if (!p) return logLine("[API] No presence data");

    updateDiscord(p);
    updateSpotify(p.spotify);
    updateGame(getRealActivity(p));

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

  if (p.avatar) document.getElementById("dp-avatar").src = p.avatar;
  if (p.username) document.getElementById("dp-username").textContent = p.username;
}

// ===============================
// SPOTIFY PANEL
// ===============================
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function truncate(text, max = 32) {
  return text && text.length > max ? text.slice(0, max) + "…" : text || "";
}

function updateSpotify(spotify) {
  const cover = document.getElementById("spotify-cover");
  const title = document.getElementById("spotify-title");
  const artist = document.getElementById("spotify-artist");
  const progressWrap = document.querySelector(".spotify-progress");
  const barFill = document.getElementById("spotify-bar-fill");
  const elapsedEl = document.getElementById("spotify-elapsed");
  const durationEl = document.getElementById("spotify-duration");

  if (!spotify) {
    cover.src = "https://i.imgur.com/8QfQFfC.png";
    title.textContent = "Not playing anything";
    artist.textContent = "";
    progressWrap.style.display = "none";
    if (spotifyInterval) clearInterval(spotifyInterval);
    lastTrackId = null;
    return;
  }

  const song = spotify.details || "";
  const artistName = spotify.state || "";
  const albumArt = spotify.assets?.largeImage
    ? `https://i.scdn.co/image/${spotify.assets.largeImage.replace("spotify:", "")}`
    : "https://i.imgur.com/8QfQFfC.png";

  const trackId = song + artistName;

  if (trackId !== lastTrackId) {
    cover.src = albumArt;
    title.textContent = truncate(song);
    artist.textContent = truncate(artistName);
    lastTrackId = trackId;
  }

  if (spotifyInterval) clearInterval(spotifyInterval);

  const start = spotify.timestamps?.start;
  const end = spotify.timestamps?.end;

  if (!start || !end) {
    progressWrap.style.display = "none";
    return;
  }

  progressWrap.style.display = "flex";

  const duration = end - start;
  durationEl.textContent = formatTime(duration);

  spotifyInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - start;
    const clamped = Math.max(0, Math.min(duration, elapsed));

    elapsedEl.textContent = formatTime(clamped);
    barFill.style.width = `${(clamped / duration) * 100}%`;
  }, 1000);
}

// ===============================
// GAME PANEL (FIXED)
// ===============================
function getRealActivity(p) {
  if (!p.activities) return null;

  // Prefer actual games (type 0)
  const game = p.activities.find(a => a.type === 0);
  if (game) return game;

  // Fallback to any non-custom activity
  return p.activities.find(a => a.type !== 4) || null;
}

function detectPlatform(activity) {
  if (!activity) return "IDLE";

  const name = activity.name.toLowerCase();

  if (activity.flags === 1) return "XBOX";
  if (name.includes("ps") || name.includes("playstation")) return "PLAYSTATION";
  if (activity.applicationId) return "PC";

  return "APP";
}

function updateGame(activity) {
  const cover = document.getElementById("xbox-cover");
  const title = document.getElementById("xbox-title");
  const details = document.getElementById("xbox-details");
  const icon = document.getElementById("xbox-icon");
  const timePlayed = document.getElementById("xbox-time");
  const platformPill = document.getElementById("xbox-platform");
  const panel = document.querySelector(".card-game");

  if (!activity) {
    panel.classList.remove("active");
    title.textContent = "Not playing";
    details.textContent = "";
    cover.src = "https://i.imgur.com/8QfQFfC.png";
    icon.src = "https://i.imgur.com/8QfQFfC.png";
    timePlayed.textContent = "";
    platformPill.textContent = "IDLE";
    lastActivityKey = null;
    if (activityTimerInterval) clearInterval(activityTimerInterval);
    return;
  }

  const key = activity.name + (activity.details || "");
  if (key === lastActivityKey) return;
  lastActivityKey = key;

  title.textContent = activity.name;
  details.textContent = activity.details || activity.state || "";
  cover.src = activity.cover || "https://i.imgur.com/8QfQFfC.png";
  icon.src = getGameLogo(activity);
  platformPill.textContent = detectPlatform(activity);

  if (activityTimerInterval) clearInterval(activityTimerInterval);

  const start = activity.timestamps?.start;
  if (start) {
    activityTimerInterval = setInterval(() => {
      const diff = Date.now() - start;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      timePlayed.textContent = `${mins}m ${secs}s`;
    }, 1000);
  } else {
    timePlayed.textContent = "";
  }

  panel.classList.add("active");
}

// ===============================
// MUSIC TOGGLE
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
        btn.textContent = "MUTE TRACK";
      } else {
        audio.pause();
        audio.muted = true;
        btn.textContent = "UNMUTE TRACK";
      }
    } catch (err) {
      console.error("[Audio] Play blocked:", err);
    }
  });
});
