const DISCORD_ID = "1360925264669966338";

// -----------------------------
// LOGGING
// -----------------------------
function logLine(text) {
  const log = document.getElementById("log-output");
  if (!log) return;
  const span = document.createElement("span");
  span.className = "log-line";
  span.textContent = text;
  log.appendChild(span);
  while (log.children.length > 5) log.removeChild(log.firstChild);
}

// -----------------------------
// UNIFIED ENGINE STATE
// -----------------------------
let lastDiscord = null;
let lastSpotify = null;
let pollRate = 12000; // adaptive
let isSpotifyActive = false;

// -----------------------------
// UNIFIED ENGINE LOOP
// -----------------------------
async function presenceEngine() {
  try {
    const res = await fetch(
      `https://api.lanyard.rest/v1/users/${DISCORD_ID}?t=${Date.now()}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    const d = json.data;

    // --- DISCORD CHANGE DETECTION ---
    if (JSON.stringify(d.discord_user) !== JSON.stringify(lastDiscord)) {
      updateDiscord(d);
      lastDiscord = structuredClone(d.discord_user);
    }

    // --- SPOTIFY CHANGE DETECTION ---
    if (JSON.stringify(d.spotify) !== JSON.stringify(lastSpotify)) {
      updateSpotify(d);
      lastSpotify = structuredClone(d.spotify);
    }

    // --- ADAPTIVE POLLING ---
    if (d.spotify) {
      pollRate = 6000; // faster when music is playing
      isSpotifyActive = true;
    } else {
      pollRate = 12000; // slower when idle
      isSpotifyActive = false;
    }

    logLine(`[Engine] Updated (rate: ${pollRate / 1000}s)`);

  } catch (err) {
    logLine("[Engine] Fetch failed, retrying...");
    pollRate = 8000; // fallback
  }

  setTimeout(presenceEngine, pollRate);
}

presenceEngine();

// -----------------------------
// DISCORD PANEL UPDATE
// -----------------------------
function updateDiscord(d) {
  if (!d || !d.discord_user) return;

  const avatarEl = document.getElementById("dp-avatar");
  if (d.discord_user.avatar) {
    const ext = d.discord_user.avatar.startsWith("a_") ? "gif" : "png";
    avatarEl.src = `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.${ext}?size=128`;
  } else {
    avatarEl.src = "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  document.getElementById("dp-username").textContent =
    d.discord_user.global_name || d.discord_user.username;

  const statusMap = {
    online: { color: "#43b581", text: "Online" },
    idle: { color: "#faa61a", text: "Idle" },
    dnd: { color: "#f04747", text: "Do Not Disturb" },
    offline: { color: "#747f8d", text: "Offline" }
  };

  const s = statusMap[d.discord_status] || statusMap.offline;

  document.getElementById("dp-status-dot").style.background = s.color;
  document.getElementById("dp-status-dot").style.boxShadow = `0 0 8px ${s.color}`;
  document.getElementById("dp-status-text").textContent = s.text;

  const custom = d.activities?.find((a) => a.type === 4);
  document.getElementById("dp-custom-status").textContent =
    custom?.state || "No active custom status";

  logLine(`[Discord] Status updated → ${s.text}`);
}

// -----------------------------
// SPOTIFY PANEL WITH SMOOTH TRANSITIONS
// -----------------------------
let previousTrackId = null;

function fadeOutElements() {
  document.getElementById("spotify-cover").classList.add("fade-out");
  document.getElementById("spotify-title").classList.add("fade-out");
  document.getElementById("spotify-artist").classList.add("fade-out");
}

function fadeInElements() {
  document.getElementById("spotify-cover").classList.remove("fade-out");
  document.getElementById("spotify-title").classList.remove("fade-out");
  document.getElementById("spotify-artist").classList.remove("fade-out");
}

function updateSpotify(d) {
  const s = d.spotify;
function updateSpotify(d) {
  const s = d.spotify;
  const cover = document.getElementById("spotify-cover");
  const title = document.getElementById("spotify-title");
  const artist = document.getElementById("spotify-artist");
  const panel = document.querySelector(".panel-spotify");

  if (!cover || !title || !artist || !panel) return;

  // If Spotify is NOT playing
  if (!s) {
    fadeOutElements();
    setTimeout(() => {
      cover.src = "https://i.imgur.com/8QfQFfC.png";
      title.textContent = "Not playing anything";
      artist.textContent = "";
      panel.classList.remove("active");
      fadeInElements();
    }, 400);

    previousTrackId = null; // RESET so next track triggers
    logLine("[Spotify] Idle (spotify: null)");
    return;
  }

  // If Spotify just started playing OR track changed
  if (s.track_id !== previousTrackId) {
    fadeOutElements();

    setTimeout(() => {
      cover.src = s.album_art_url;
      title.textContent = s.song;
      artist.textContent = s.artist;
      panel.classList.add("active");
      fadeInElements();
    }, 400);

    logLine(`[Spotify] Now playing: ${s.song} — ${s.artist}`);
    previousTrackId = s.track_id;
  }
}
