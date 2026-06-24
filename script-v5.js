// ===============================
// CONFIG
// ===============================
const USER_ID = "1360925264669966338";
const API_URL = `https://jester-presence-api.onrender.com/api/presence?user=${USER_ID}&nocache=`;

// Trackers
let lastTrackId = null;
let lastSpotify = null;
let spotifyInterval = null;
let activityTimerInterval = null;
let lastActivityKey = null;

// ===============================
// TEMP ICON SET (APEX ONLY)
// ===============================
const ICON_BASE = "https://silver-arc-production.github.io/Jester-Bot-Deployment/assets/icons/";

const GAME_LOGOS = {
  apex: ICON_BASE + "apex.png"
};

const DEFAULT_ICON = ICON_BASE + "apex.png";
const XBOX_ICON = ICON_BASE + "apex.png";
const PLAYSTATION_ICON = ICON_BASE + "apex.png";

// ===============================
// GAME LOGO RESOLVER
// ===============================
function getGameLogo(activity) {
  if (!activity) return DEFAULT_ICON;

  // Prefer Discord smallImage if present
  if (activity.assets?.smallImage) {
    return `https://media.discordapp.net/${activity.assets.smallImage.replace("mp:", "")}`;
  }

  // Use details first (console often puts game name here), then name
  const rawName = (activity.details || activity.name || "").toLowerCase();

  for (const key in GAME_LOGOS) {
    if (rawName.includes(key)) return GAME_LOGOS[key];
  }

  // Fallback by platform
  const platform = (activity.platform || "").toUpperCase();
  if (platform === "XBOX") return XBOX_ICON;
  if (platform === "PLAYSTATION") return PLAYSTATION_ICON;

  return DEFAULT_ICON;
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

setInterval(fetchPresence, 2000);
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
// SPOTIFY PANEL (FAST + CACHED)
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

  if (!spotify && lastSpotify) {
    const now = Date.now();
    const end = lastSpotify.timestamps?.end
      ? new Date(lastSpotify.timestamps.end).getTime()
      : null;

    if (end && now < end) {
      spotify = lastSpotify;
    } else {
      lastSpotify = null;
      progressWrap.style.display = "none";
      title.textContent = "Not playing anything";
      artist.textContent = "";
      cover.src = DEFAULT_ICON;
      return;
    }
  }

  if (!spotify) return;

  lastSpotify = spotify;

  const song = spotify.details || "";
  const artistName = spotify.state || "";
  const albumArt = spotify.assets?.largeImage
    ? `https://i.scdn.co/image/${spotify.assets.largeImage.replace("spotify:", "")}`
    : DEFAULT_ICON;

  cover.src = albumArt;
  title.textContent = truncate(song);
  artist.textContent = truncate(artistName);

  const start = spotify.timestamps?.start
    ? new Date(spotify.timestamps.start).getTime()
    : null;

  const end = spotify.timestamps?.end
    ? new Date(spotify.timestamps.end).getTime()
    : null;

  if (!start || !end) {
    progressWrap.style.display = "none";
    return;
  }

  progressWrap.style.display = "flex";

  const duration = end - start;
  durationEl.textContent = formatTime(duration);

  if (spotifyInterval) clearInterval(spotifyInterval);

  spotifyInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - start;
    const clamped = Math.max(0, Math.min(duration, elapsed));

    elapsedEl.textContent = formatTime(clamped);
    barFill.style.width = `${(clamped / duration) * 100}%`;

    if (now >= end) {
      lastSpotify = null;
      clearInterval(spotifyInterval);
    }
  }, 1000);
}

// ===============================
// GAME PANEL
// ===============================
function getRealActivity(p) {
  if (p.xbox) return p.xbox;
  if (p.playstation) return p.playstation;
  if (p.game) return p.game;
  return null;
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
    cover.src = DEFAULT_ICON;
    icon.src = DEFAULT_ICON;
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

  cover.src = activity.assets?.largeImage
    ? `https://media.discordapp.net/${activity.assets.largeImage.replace("mp:", "")}`
    : DEFAULT_ICON;

  icon.src = getGameLogo(activity);
  platformPill.textContent = activity.platform || "APP";

  if (activityTimerInterval) clearInterval(activityTimerInterval);

  const start = activity.timestamps?.start
    ? new Date(activity.timestamps.start).getTime()
    : null;

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
