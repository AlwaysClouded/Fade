// ===============================
// CONFIG
// ===============================
const USER_ID = "1360925264669966338";
const WS_URL = "wss://identities-presence.onrender.com/socket";
const REST_URL = `https://identities-presence.onrender.com/v1/users/${USER_ID}`;

// Track last states
let lastTrackId = null;
let spotifyInterval = null;
let ws = null;
let heartbeatTimer = null;
let reconnectTimer = null;
let didConnect = false;

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
  while (log.children.length > 6) log.removeChild(log.firstChild);
}

// ===============================
// PRESENCE (WebSocket + REST fallback)
// ===============================
const OPCODE = { HELLO: 1, INIT: 2, HEARTBEAT: 3, DISPATCH: 0 };

function handlePresence(data) {
  if (!data) {
    logLine("[API] No presence data");
    return;
  }
  updatePresence(data);
  updateSpotify(data.spotify);
  logLine("[API] Presence updated");
}

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    logLine("[WS] Connect failed");
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    didConnect = true;
    logLine("[WS] Connected");
  };

  ws.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.op) {
      case OPCODE.HELLO: {
        const interval = msg.d?.heartbeat_interval ?? 30000;
        startHeartbeat(interval);
        ws.send(JSON.stringify({ op: OPCODE.INIT, d: { subscribe_to_id: USER_ID } }));
        break;
      }
      case OPCODE.DISPATCH: {
        const presence = msg.d?.[USER_ID];
        if (presence) handlePresence(presence);
        break;
      }
      default:
        break;
    }
  };

  ws.onerror = () => logLine("[WS] Error");
  ws.onclose = () => {
    stopHeartbeat();
    logLine("[WS] Disconnected");
    scheduleReconnect();
  };
}

function startHeartbeat(interval) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: OPCODE.HEARTBEAT }));
    }
  }, interval);
}

function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = didConnect ? 5000 : 15000;
  logLine(`[WS] Reconnecting in ${delay / 1000}s`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, delay);
}

async function fetchPresenceREST() {
  try {
    const res = await fetch(REST_URL, { cache: "no-store" });
    const json = await res.json();
    handlePresence(json?.data);
  } catch (err) {
    logLine("[API] Fetch error");
  }
}

connectWebSocket();
// REST fallback: initial snapshot and periodic refresh if the socket is not open
fetchPresenceREST();
setInterval(() => {
  if (!ws || ws.readyState !== WebSocket.OPEN) fetchPresenceREST();
}, 5000);

// ===============================
// PRESENCE PANEL
// ===============================
function updatePresence(p) {
  const statusMap = {
    online: { color: "#a8bfa1", text: "Online" },
    idle: { color: "#e7a8b8", text: "Idle" },
    dnd: { color: "#f04747", text: "Do Not Disturb" },
    offline: { color: "#747f8d", text: "Offline" }
  };

  const status = p.discord_status || p.status || "offline";
  const s = statusMap[status] || statusMap.offline;

  const customStatus =
    (Array.isArray(p.activities) &&
      p.activities.find(a => a.type === 4)?.state) ||
    p.customStatus ||
    null;

  const user = p.discord_user || {};
  const avatarHash = user.avatar;
  const ext = avatarHash && avatarHash.startsWith("a_") ? "gif" : "png";
  const avatarUrl = avatarHash
    ? `https://cdn.discordapp.com/avatars/${user.id}/${avatarHash}.${ext}?size=256`
    : null;
  const displayName = user.global_name || user.username || p.username || "User";

  const dot = document.getElementById("dp-status-dot");
  const text = document.getElementById("dp-status-text");
  const custom = document.getElementById("dp-custom-status");
  const avatar = document.getElementById("dp-avatar");
  const username = document.getElementById("dp-username");
  const handle = document.getElementById("hero-handle");

  if (dot) {
    dot.style.background = s.color;
    dot.style.boxShadow = `0 0 8px ${s.color}`;
  }

  if (text) text.textContent = s.text;
  if (custom) custom.textContent = customStatus || "No custom status";

  if (avatar && avatarUrl) avatar.src = avatarUrl;
  if (username) username.textContent = displayName;
  if (handle) handle.textContent = `@${user.username || displayName}`;
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
  const panel = document.querySelector(".card-spotify");

  const elapsedEl = document.getElementById("spotify-elapsed");
  const durationEl = document.getElementById("spotify-duration");
  const barFill = document.getElementById("spotify-bar-fill");
  const progressWrap = document.querySelector(".spotify-progress");

  if (!cover || !title || !artist || !panel || !elapsedEl || !durationEl || !barFill || !progressWrap) return;

  if (!spotify) {
    panel.classList.remove("active");
    if (spotifyInterval) clearInterval(spotifyInterval);

    cover.src = "https://i.imgur.com/8QfQFfC.png";
    title.textContent = "Not playing anything";
    artist.textContent = "";

    progressWrap.style.display = "none";
    lastTrackId = null;
    logLine("[Spotify] Idle");
    return;
  }

  const song = spotify.song || spotify.details || "";
  const artistName = spotify.artist || spotify.state || "";
  const albumArt = spotify.album_art_url
    || (spotify.assets?.largeImage
      ? `https://i.scdn.co/image/${spotify.assets.largeImage.replace("spotify:", "")}`
      : "https://i.imgur.com/8QfQFfC.png");

  const trackId = song + artistName;

  if (trackId !== lastTrackId) {
    cover.src = albumArt;
    title.textContent = truncate(song, 32);
    artist.textContent = truncate(artistName, 32);
    panel.classList.add("active");
    lastTrackId = trackId;
    logLine(`[Spotify] ${song} — ${artistName}`);
  }

  if (spotifyInterval) clearInterval(spotifyInterval);

  const start = spotify.timestamps?.start ? Number(spotify.timestamps.start) : null;
  const end = spotify.timestamps?.end ? Number(spotify.timestamps.end) : null;

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

    const progress = Math.min(1, clamped / duration);
    barFill.style.width = `${progress * 100}%`;
  }, 1000);
}

// ===============================
// MUSIC TOGGLE + COPY LINK
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("music-unlock");
  const audio = document.getElementById("bg-audio");

  if (audio) audio.muted = true;

  if (btn && audio) {
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
  }
});
