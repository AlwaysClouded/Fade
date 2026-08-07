// ===============================
// CONFIG (LANYARD)
// ===============================
const USER_ID = "1360925264669966338";
const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;

// State trackers
let lastSpotify = null;
let spotifyInterval = null;
let activityTimerInterval = null;
let lastActivityKey = null;

// ===============================
// ICONS (RENDER HOSTED)
// ===============================
const ICON_BASE = "https://jester-presence-api.onrender.com/icons/";

const GAME_LOGOS = {
  apex: ICON_BASE + "apex.png",
  fortnite: ICON_BASE + "fortnite.png",
  minecraft: ICON_BASE + "minecraft.png",
  roblox: ICON_BASE + "roblox.png",
  thieves: ICON_BASE + "thieves.png",
  astroneer: ICON_BASE + "astroneer.png"
};

const PLATFORM_ICONS = {
  xbox: ICON_BASE + "xbox.png",
  playstation: ICON_BASE + "playstation.png"
};

const PLACEHOLDER_ICON = ICON_BASE + "game-placeholder.png";

// ===============================
// AUDIO PLAYER (FIXED)
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
      console.error(err);
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
// ICON RESOLUTION
// ===============================
function getGameLogo(activity) {
  if (!activity) return PLACEHOLDER_ICON;

  if (activity.assets?.large_image) {
    return `https://media.discordapp.net/${activity.assets.large_image.replace("mp:", "")}`;
  }

  const rawName = (activity.details || activity.name || "").toLowerCase();

  for (const key in GAME_LOGOS) {
    if (rawName.includes(key)) return GAME_LOGOS[key];
  }

  return PLACEHOLDER_ICON;
}

function getPlatformIcon(activity) {
  if (!activity) return null;

  const platform = (activity.platform || "").toLowerCase();

  if (platform.includes("xbox")) return PLATFORM_ICONS.xbox;
  if (platform.includes("playstation")) return PLATFORM_ICONS.playstation;

  return null;
}

// ===============================
// PRESENCE FETCHING (LANYARD)
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
// SPOTIFY PANEL (LANYARD)
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

  cover.src = `https://i.scdn.co/image/${spotify.album_art_url.replace("spotify:", "")}`;
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
// GAME PANEL (LANYARD)
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
