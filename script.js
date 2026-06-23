// ===============================
// CONFIG
// ===============================
const USER_ID = "1360925264669966338"; // YOUR ID
const API_URL = `https://jester-presence-api.onrender.com/api/presence?user=${USER_ID}`;

let lastTrackId = null;
let lastXboxState = null;

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
// LAZY-TRACKING FETCH
// ===============================
async function fetchPresenceLazy() {
  // First request (marks user as tracked)
  let res = await fetch(API_URL + "&t=" + Date.now(), { cache: "no-store" });
  let json = await res.json();

  // If presence is null, wait for worker force-fetch
  if (!json.presence || !json.presence[USER_ID]) {
    logLine("[API] Waiting for worker...");
    await new Promise(r => setTimeout(r, 1500));

    res = await fetch(API_URL + "&t=" + Date.now(), { cache: "no-store" });
    json = await res.json();
  }

  return json.presence ? json.presence[USER_ID] : null;
}

// ===============================
// FETCH PRESENCE LOOP
// ===============================
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
// SPOTIFY PANEL
// ===============================
function fadeOutSpotify() {
  document.getElementById("spotify-cover")?.classList.add("fade-out");
  document.getElementById("spotify-title")?.classList.add("fade-out");
  document.getElementById("spotify-artist")?.classList.add("fade-out");
}

function fadeInSpotify() {
  document.getElementById("spotify-cover")?.classList.remove("fade-out");
  document.getElementById("spotify-title")?.classList.remove("fade-out");
  document.getElementById("spotify-artist")?.classList.remove("fade-out");
}

function updateSpotify(spotify) {
  const cover = document.getElementById("spotify-cover");
  const title = document.getElementById("spotify-title");
  const artist = document.getElementById("spotify-artist");
  const panel = document.querySelector(".panel-spotify");

  if (!cover || !title || !artist || !panel) return;

  if (!spotify) {
    if (lastTrackId !== null) {
      fadeOutSpotify();
      setTimeout(() => {
        cover.src = "https://i.imgur.com/8QfQFfC.png";
        title.textContent = "Not playing anything";
        artist.textContent = "";
        panel.classList.remove("active");
        fadeInSpotify();
      }, 200);
      lastTrackId = null;
      logLine("[Spotify] Idle");
    }
    return;
  }

  const song = spotify.song;
  const artistName = spotify.artist;
  const albumArt = spotify.albumArt;

  const trackId = song + artistName;

  if (trackId !== lastTrackId) {
    fadeOutSpotify();
    setTimeout(() => {
      cover.src = albumArt || "https://i.imgur.com/8QfQFfC.png";
      title.textContent = song;
      artist.textContent = artistName;
      panel.classList.add("active");
      fadeInSpotify();
    }, 200);

    logLine(`[Spotify] ${song} — ${artistName}`);
    lastTrackId = trackId;
  }
}

// ===============================
// XBOX / GAME PANEL
// ===============================
function updateXbox(activity) {
  const cover = document.getElementById("xbox-cover");
  const title = document.getElementById("xbox-title");
  const details = document.getElementById("xbox-details");
  const panel = document.querySelector(".panel-xbox");

  if (!cover || !title || !details || !panel) return;

  if (!activity) {
    if (lastXboxState !== null) {
      title.textContent = "Not playing";
      details.textContent = "";
      cover.src = "https://i.imgur.com/8QfQFfC.png";
      panel.classList.remove("active");
      lastXboxState = null;
      logLine("[Game] Idle");
    }
    return;
  }

  const game = activity.name || "Playing";
  const state = activity.details || activity.state || "";
  const coverUrl = activity.cover || "https://i.imgur.com/8QfQFfC.png";

  const stateKey = game + state + coverUrl;

  if (stateKey === lastXboxState) return;

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

  if (!btn || !audio) {
    console.error("[BloodRush] Missing button or audio element");
    return;
  }

  audio.muted = true;

  btn.addEventListener("click", async () => {
    try {
      if (audio.paused || audio.muted) {
        audio.muted = false;
        await audio.play();
        btn.textContent = "MUTE BLOOD RUSH";
        console.log("[BloodRush] Playing");
      } else {
        audio.pause();
        audio.muted = true;
        btn.textContent = "UNMUTE BLOOD RUSH";
        console.log("[BloodRush] Muted");
      }
    } catch (err) {
      console.error("[BloodRush] Play blocked:", err);
    }
  });
});
