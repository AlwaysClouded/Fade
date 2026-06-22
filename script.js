// ===============================
// CONFIG
// ===============================
const API_URL = "https://jester-presence-api.onrender.com/api/presence";

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
// FETCH PRESENCE LOOP
// ===============================
async function fetchPresence() {
  try {
    const res = await fetch(API_URL + "?t=" + Date.now(), { cache: "no-store" });
    const json = await res.json();

    if (!json.success || !json.presence) {
      logLine("[API] No presence data");
      return;
    }

    const p = json.presence;

    updateDiscord(p);
    updateSpotify(p.spotify);
    updateXbox(p.xbox);

    logLine("[API] Presence updated");

  } catch (err) {
    logLine("[API] Fetch error");
  }
}

setInterval(fetchPresence, 5005);
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

  // ⭐ NEW API FORMAT
  const song = spotify.details || "Unknown Track";
  const artistName = spotify.state || "Unknown Artist";

  let albumArt = null;
  if (spotify.assets?.largeImage?.startsWith("spotify:")) {
    const id = spotify.assets.largeImage.replace("spotify:", "");
    albumArt = `https://i.scdn.co/image/${id}`;
  }

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
// XBOX PANEL
// ===============================
function updateXbox(xbox) {
  const cover = document.getElementById("xbox-cover");
  const title = document.getElementById("xbox-title");
  const details = document.getElementById("xbox-details");
  const panel = document.querySelector(".panel-xbox");

  if (!cover || !title || !details || !panel) return;

  if (!xbox) {
    if (lastXboxState !== null) {
      title.textContent = "Not playing on Xbox";
      details.textContent = "";
      cover.src = "https://i.imgur.com/8QfQFfC.png";
      panel.classList.remove("active");
      lastXboxState = null;
      logLine("[Xbox] Idle");
    }
    return;
  }

  const game = xbox.name || "Playing on Xbox";
  const state = xbox.details || "";

  let coverUrl = null;
  if (xbox.assets?.largeImage?.startsWith("xbox:")) {
    const id = xbox.assets.largeImage.replace("xbox:", "");
    coverUrl = `https://images-eds.xboxlive.com/image?url=${id}`;
  }

  const stateKey = game + state + coverUrl;

  if (stateKey === lastXboxState) return;

  title.textContent = game;
  details.textContent = state;
  cover.src = coverUrl || "https://i.imgur.com/8QfQFfC.png";

  panel.classList.add("active");
  lastXboxState = stateKey;

  logLine(`[Xbox] ${game}`);
}
