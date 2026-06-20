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
// ENGINE STATE
// -----------------------------
let lastTrackId = null;
let lastStatus = null;

// -----------------------------
// MAIN POLLER (EVERY 10 SECONDS)
// -----------------------------
async function pollLanyard() {
  try {
    const res = await fetch(
      `https://api.lanyard.rest/v1/users/${DISCORD_ID}?t=${Date.now()}`,
      { cache: "no-store" }
    );

    const json = await res.json();
    const d = json.data;

    updateDiscord(d);
    updateSpotify(d);

    logLine("[Lanyard] Polled successfully");
  } catch (err) {
    logLine("[Lanyard] Poll failed");
  }
}

setInterval(pollLanyard, 10000);
pollLanyard();

// -----------------------------
// DISCORD UPDATE
// -----------------------------
function updateDiscord(d) {
  if (!d || !d.discord_user) return;

  // Avatar
  const avatarEl = document.getElementById("dp-avatar");
  if (d.discord_user.avatar) {
    const ext = d.discord_user.avatar.startsWith("a_") ? "gif" : "png";
    avatarEl.src = `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.${ext}?size=128`;
  } else {
    avatarEl.src = "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  // Username
  document.getElementById("dp-username").textContent =
    d.discord_user.global_name || d.discord_user.username;

  // Status
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

  // Custom status
  const custom = d.activities?.find((a) => a.type === 4);
  document.getElementById("dp-custom-status").textContent =
    custom?.state || "No active custom status";

  // Log only when status changes
  if (lastStatus !== d.discord_status) {
    logLine(`[Discord] Status → ${s.text}`);
    lastStatus = d.discord_status;
  }
}

// -----------------------------
// SPOTIFY UPDATE (STABLE VERSION)
// -----------------------------
function fadeOutSpotify() {
  document.getElementById("spotify-cover").classList.add("fade-out");
  document.getElementById("spotify-title").classList.add("fade-out");
  document.getElementById("spotify-artist").classList.add("fade-out");
}

function fadeInSpotify() {
  document.getElementById("spotify-cover").classList.remove("fade-out");
  document.getElementById("spotify-title").classList.remove("fade-out");
  document.getElementById("spotify-artist").classList.remove("fade-out");
}

function updateSpotify(d) {
  const s = d.spotify;
  const cover = document.getElementById("spotify-cover");
  const title = document.getElementById("spotify-title");
  const artist = document.getElementById("spotify-artist");
  const panel = document.querySelector(".panel-spotify");

  // If Spotify is NOT playing
  if (!s) {
    if (lastTrackId !== null) {
      fadeOutSpotify();
      setTimeout(() => {
        cover.src = "https://i.imgur.com/8QfQFfC.png";
        title.textContent = "Not playing anything";
        artist.textContent = "";
        panel.classList.remove("active");
        fadeInSpotify();
      }, 400);

      logLine("[Spotify] Idle");
      lastTrackId = null;
    }
    return;
  }

  // If track changed
  if (s.track_id !== lastTrackId) {
    fadeOutSpotify();

    setTimeout(() => {
      cover.src = s.album_art_url;
      title.textContent = s.song;
      artist.textContent = s.artist;
      panel.classList.add("active");
      fadeInSpotify();
    }, 400);

    logLine(`[Spotify] ${s.song} — ${s.artist}`);
    lastTrackId = s.track_id;
  }
}
