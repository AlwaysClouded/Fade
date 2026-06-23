// ===============================
// CONFIG
// ===============================
const USER_ID = "1360925264669966338";
const API_URL = `https://jester-presence-api.onrender.com/api/presence?user=${USER_ID}&nocache=`;

// Track last states
let lastTrackId = null;
let lastXboxState = null;
let gameTimerInterval = null;
let spotifyInterval = null;

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

  if (activity?.applicationId?.startsWith?.("xbox"))
    return "https://i.imgur.com/1uXKp8y.png";

  if (activity?.applicationId?.startsWith?.("ps"))
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

  const dot = document.getElementById("dp-status-dot");
  const text = document.getElementById("dp-status-text");
  const custom = document.getElementById("dp-custom-status");
  const avatar = document.getElementById("dp-avatar");
  const username = document.getElementById("dp-username");

  if (dot) {
    dot.style.background = s.color;
    dot.style.boxShadow = `0 0 8px ${s.color}`;
  }

  if (text) text.textContent = s.text;
  if (custom) custom.textContent = p.customStatus || "No custom status";

  if (avatar && p.avatar) avatar.src = p.avatar;
  if (username && p.username) username.textContent = p.username;
}

// ===============================
// SPOTIFY PANEL (WITH PROGRESS)
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
  const panel = document.querySelector(".panel-spotify");

  const elapsedEl = document.getElementById("spotify-elapsed");
  const durationEl = document.getElementById("spotify-duration");
  const barFill = document.getElementById("spotify-bar-fill");

  if (!cover || !title || !artist || !panel || !elapsedEl || !durationEl || !barFill) return;

  if (!spotify) {
    panel.classList.remove("active");
    if (spotifyInterval) clearInterval(spotifyInterval);
    cover.src = "https://i.imgur.com/8QfQFfC.png";
    title.textContent = "Not playing anything";
    artist.textContent = "";
    elapsedEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    barFill.style.width = "0%";
    lastTrackId = null;
    logLine("[Spotify] Idle");
    return;
  }

  const song = spotify.details || "";
  const artistName = spotify.state || "";
  const albumArt = spotify.assets?.largeImage
    ? `https://i.scdn.co/image/${spotify.assets.largeImage.replace("spotify:", "")}`
    : "https://i.imgur.com/8QfQFfC.png";

  const trackId = song + artistName;

  const start = spotify.timestamps?.start ? Number(spotify.timestamps.start) : null;
  const end = spotify.timestamps?.end ? Number(spotify.timestamps.end) : null;

  if (trackId !== lastTrackId) {
    cover.src = albumArt;
    title.textContent = truncate(song, 32);
    artist.textContent = truncate(artistName, 32);
    panel.classList.add("active");
    lastTrackId = trackId;
    logLine(`[Spotify] ${song} — ${artistName}`);
  }

  if (spotifyInterval) clearInterval(spotifyInterval);

  if (!start || !end) {
    elapsedEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    barFill.style.width = "0%";
    return;
  }

  const duration = end - start;
  durationEl.textContent = formatTime(duration);

  spotifyInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - start;
    const clamped = Math.max(0, Math.min(duration, elapsed));

    elapsedEl.textContent = formatTime(clamped);

    const progress = Math.min(1, clamped / duration);
    barFill.style.width = `${progress * 100}%`;
  }, 1000);
}

// ===============================
// XBOX / GAME PANEL (WITH LOGO + TIME)
// ===============================
function updateXbox(activity) {
  const cover = document.getElementById("xbox-cover");
  const title = document.getElementById("xbox-title");
  const details = document.getElementById("xbox-details");
  const panel = document.querySelector(".panel-xbox");
  const icon = document.getElementById("xbox-icon");
  const timePlayed = document.getElementById("xbox-time");

  if (!cover || !title || !details || !panel || !icon || !timePlayed) return;

  if (!activity) {
    if (lastXboxState !== null) {
      title.textContent = "Not playing";
      details.textContent = "";
      cover.src = "https://i.imgur.com/8QfQFfC.png";
      icon.src = "https://i.imgur.com/8QfQFfC.png";
      timePlayed.textContent = "";
      panel.classList.remove("active");
      lastXboxState = null;
      if (gameTimerInterval) clearInterval(gameTimerInterval);
      logLine("[Game] Idle");
    }
    return;
  }

  const game = activity.name || "Playing";
  const state = activity.details || activity.state || "";
  const coverUrl = activity.cover || "https://i.imgur.com/8QfQFfC.png";

  const stateKey = game + state;
  if (stateKey === lastXboxState) return;

  icon.src = getGameLogo(game, activity);

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
  } else {
    timePlayed.textContent = "";
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
