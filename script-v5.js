// ===============================
// CONFIG (LANYARD ONLY)
// ===============================
const USER_ID = "1360925264669966338";
const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;

// State trackers
let lastSpotify = null;
let spotifyInterval = null;
let activityTimerInterval = null;
let lastActivityKey = null;

// ===============================
// ICONS (PUBLIC SOURCES)
// ===============================
const GAME_LOGOS = {
  fortnite: "https://static.wikia.nocookie.net/fortnite_gamepedia/images/5/5f/Fortnite_F_icon.png",
  minecraft: "https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/4e/Grass_Block_JE5_BE3.png",
  roblox: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Roblox_Logo_Black.svg",
  apex: "https://static.wikia.nocookie.net/apexlegends_gamepedia/images/2/2f/Apex_Legends_icon.png"
};

const PLATFORM_ICONS = {
  xbox: "https://upload.wikimedia.org/wikipedia/commons/4/43/Xbox_one_logo.svg",
  playstation: "https://upload.wikimedia.org/wikipedia/commons/4/4e/PlayStation_logo.svg"
};

const PLACEHOLDER_ICON = "https://i.imgur.com/8QfQFfC.png";

// ===============================
// AUDIO PLAYER
// ===============================
const audio = document.getElementById("bg-audio");
const unlockBtn = document.getElementById("music-unlock");

if (unlockBtn && audio) {
  unlockBtn.addEventListener("click", async () => {
    try {
      if (!audio.src || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        logLine("[Audio] ERROR: Audio file missing or failed to load");
        return;
      }

      if (audio.paused || audio.muted) {
        audio.muted = false;
        await audio.play();
        unlockBtn.textContent = "MUTE TRACK";
        logLine("[Audio] Track unmuted + playing");
      } else {
        audio.muted = true;
        audio.pause();
        unlockBtn.textContent = "UNMUTE TRACK";
        logLine("[Audio] Track muted + paused");
      }
    } catch (err) {
      logLine("[Audio] Playback blocked or failed");
    }
  });
}

// ===============================
// HELPERS
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

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function truncate(text, max = 32) {
  return text && text.length > max ? text.slice(0, max) + "…" : text || "";
}

// ===============================
// GAME ICON RESOLUTION
// ===============================
function getGameLogo(activity) {
  if (!activity) return PLACEHOLDER_ICON;

  const rawName = (activity.name || "").toLowerCase();

  for (const key in GAME_LOGOS) {
    if (rawName.includes(key)) return GAME_LOGOS[key];
  }

  return PLACEHOLDER_ICON;
}

function getPlatformIcon(activity) {
  if (!activity || !activity.platform) return null;

  const platform = activity.platform.toLowerCase();

  if (platform.includes("xbox")) return PLATFORM_ICONS.xbox;
  if (platform.includes("playstation")) return PLATFORM_ICONS.playstation;

  return null;
}

// ===============================
// FETCH PRESENCE (LANYARD)
// ===============================
async function fetchPresence() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();

    if (!json.success) {
      logLine("[API] Lanyard error");
      return;
    }

    const p = json.data;

    updateDiscord(p);
    updateSpotify(p.spotify);
    updateGame(resolveActivity(p));

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

  const s = statusMap[p.discord_status] || statusMap.offline;

  document.getElementById("dp-status-dot").style.background = s.color;
  document.getElementById("dp-status-text").textContent = s.text;

  const custom = p.activities.find(a => a.type === 4);
  document.getElementById("dp-custom-status").textContent =
    custom?.state || "No custom status";

  const user = p.discord_user;
  document.getElementById("dp-avatar").src =
    `https://cdn.discordapp.com/avatars/${USER_ID}/${user.avatar}.png`;

  document.getElementById("dp-username").textContent =
    user.global_name || user.username;
}

// ===============================
// SPOTIFY PANEL (NEW ALBUM ART LOGIC)
// ===============================
function updateSpotify(spotify) {
  const cover = document.getElementById("spotify-cover");
  const title = document.getElementById("spotify-title");
  const artist = document.getElementById("spotify-artist");
  const progressWrap = document.querySelector(".spotify-progress");
  const barFill = document.getElementById("spotify-bar-fill");
  const elapsedEl = document.getElementById("spotify-elapsed");
  const durationEl = document.getElementById("spotify-duration");

  if (!spotify) {
    title.textContent = "Not playing anything";
    artist.textContent = "";
    cover.src = PLACEHOLDER_ICON;
    progressWrap.style.display = "none";
    return;
  }

  lastSpotify = spotify;

  // NEW: stable album art
  const artId = spotify.album_art_url.replace("spotify:", "");
  cover.src = `https://i.scdn.co/image/${artId}`;

  title.textContent = truncate(spotify.song);
  artist.textContent = truncate(spotify.artist);

  const start = spotify.timestamps.start;
  const end = spotify.timestamps.end;

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
// GAME PANEL (NEW XBOX DETECTION)
// ===============================
function resolveActivity(p) {
  const acts = p.activities;

  const xbox = acts.find(a => a.type === 0 && a.platform === "xbox");
  const ps = acts.find(a => a.type === 0 && a.platform === "playstation");
  const game = acts.find(a => a.type === 0);

  if (xbox) return { ...xbox, platform: "Xbox" };
  if (ps) return { ...ps, platform: "PlayStation" };
  if (game) return game;

  return null;
}

function updateGame(activity) {
  const cover = document.getElementById("game-cover");
  const icon = document.getElementById("game-icon");
  const title = document.getElementById("game-title");
  const details = document.getElementById("game-details");
  const timePlayed = document.getElementById("game-time");
  const platformPill = document.getElementById("game-platform");
  const panel = document.querySelector(".card-game");

  if (!activity) {
    panel.classList.remove("active");
    title.textContent = "Not playing";
    details.textContent = "";
    cover.src = PLACEHOLDER_ICON;
    icon.style.display = "none";
    platformPill.style.display = "none";
    timePlayed.textContent = "";
    return;
  }

  title.textContent = activity.name;
  details.textContent = activity.details || "";

  cover.src = getGameLogo(activity);

  const platformIcon = getPlatformIcon(activity);

  if (platformIcon) {
    icon.src = platformIcon;
    icon.style.display = "block";
    platformPill.style.display = "inline-block";
    platformPill.textContent = activity.platform;
  } else {
    icon.style.display = "none";
    platformPill.style.display = "none";
  }

  const start = activity.timestamps?.start;

  if (start) {
    if (activityTimerInterval) clearInterval(activityTimerInterval);

    activityTimerInterval = setInterval(() => {
      const diff = Date.now() - start;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      timePlayed.textContent = `${mins}m ${secs}s`;
    }, 1000);
  }

  panel.classList.add("active");
}
