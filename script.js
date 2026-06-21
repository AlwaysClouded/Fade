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

  if (dot) {
    dot.style.background = s.color;
    dot.style.boxShadow = `0 0 8px ${s.color}`;
  }

  if (text) text.textContent = s.text;
  if (custom) custom.textContent = p.customStatus || "No custom status";
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

  const trackId = spotify.song + spotify.artist;

  if (trackId !== lastTrackId) {
    fadeOutSpotify();
    setTimeout(() => {
      cover.src = spotify.albumArt || "https://i.imgur.com/8QfQFfC.png";
      title.textContent = spotify.song;
      artist.textContent = spotify.artist;
      panel.classList.add("active");
      fadeInSpotify();
    }, 200);

    logLine(`[Spotify] ${spotify.song} — ${spotify.artist}`);
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

  const stateKey = (xbox.game || "") + (xbox.state || "") + (xbox.cover || "");

  if (stateKey === lastXboxState) return;

  title.textContent = xbox.game || "Playing on Xbox";
  details.textContent = xbox.state || "";

  cover.src = xbox.cover || "https://i.imgur.com/8QfQFfC.png";

  panel.classList.add("active");
  lastXboxState = stateKey;

  logLine(`[Xbox] ${title.textContent}`);
}
