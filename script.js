const DISCORD_ID = "1360925264669966338";

let ws;
let lastStatus = null;
let lastTrackId = null;
let lastXboxState = null;

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
// LANYARD WEBSOCKET
// -----------------------------
function connectLanyard() {
  ws = new WebSocket("wss://api.lanyard.rest/socket");

  ws.onopen = () => {
    logLine("[Lanyard] Connected to gateway");
    ws.send(
      JSON.stringify({
        op: 2,
        d: { subscribe_to_id: DISCORD_ID }
      })
    );
  };

  ws.onmessage = (event) => {
    const packet = JSON.parse(event.data);

    if (packet.op === 1) {
      // heartbeat
      ws.send(JSON.stringify({ op: 3 }));
      return;
    }

    if (packet.t === "INIT_STATE") {
      const d = packet.d[DISCORD_ID];
      if (d) handlePresence(d, "[INIT]");
    } else if (packet.t === "PRESENCE_UPDATE") {
      const d = packet.d;
      if (d) handlePresence(d, "[UPDATE]");
    }
  };

  ws.onclose = () => {
    logLine("[Lanyard] Disconnected, retrying in 3s...");
    setTimeout(connectLanyard, 3000);
  };

  ws.onerror = () => {
    logLine("[Lanyard] WebSocket error");
  };
}

function handlePresence(d, tag) {
  updateDiscord(d);
  updateSpotify(d);
  updateXbox(d);
  logLine(`${tag} Presence processed`);
}

connectLanyard();

// -----------------------------
// DISCORD UPDATE
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

  if (lastStatus !== d.discord_status) {
    logLine(`[Discord] Status → ${s.text}`);
    lastStatus = d.discord_status;
  }
}

// -----------------------------
// SPOTIFY WITH SMOOTH TRANSITIONS
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
  if (!cover || !title || !artist || !panel) return;

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

// -----------------------------
// XBOX ACTIVITY PANEL
// -----------------------------
function updateXbox(d) {
  const xbox = d.activities?.find((a) => a.name === "Xbox");

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
      logLine("[Xbox] Idle");
      lastXboxState = null;
    }
    return;
  }

  const stateKey =
    (xbox.details || "") + (xbox.state || "") + (xbox.assets?.large_image || "");
  if (stateKey === lastXboxState) return;

  title.textContent = xbox.state || "Playing on Xbox";
  details.textContent = xbox.details || "";

  if (xbox.assets?.large_image) {
    cover.src = xbox.assets.large_image.startsWith("mp:")
      ? `https://media.discordapp.net/${xbox.assets.large_image.replace("mp:", "")}`
      : "https://i.imgur.com/8QfQFfC.png";
  } else {
    cover.src = "https://i.imgur.com/8QfQFfC.png";
  }

  panel.classList.add("active");
  logLine(`[Xbox] ${title.textContent}`);
  lastXboxState = stateKey;
}

// -----------------------------
// AUDIO UNLOCK BUTTON
// -----------------------------
const unlockBtn = document.getElementById("music-unlock");

if (unlockBtn) {
  unlockBtn.onclick = () => {
    const audio = document.getElementById("bg-audio");
    if (!audio) return;

    if (audio.muted || audio.paused) {
      audio.muted = false;
      audio.play().catch(() => {
        logLine("[Audio] Playback blocked by browser");
      });
      unlockBtn.textContent = "MUTE BLOOD RUSH";
      logLine("[Audio] Blood rush unmuted");
    } else {
      audio.muted = true;
      audio.pause();
      unlockBtn.textContent = "UNMUTE BLOOD RUSH";
      logLine("[Audio] Blood rush muted");
    }
  };
}

// -----------------------------
// BACKGROUND PARTICLE EFFECT
// -----------------------------
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const parts = [];

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }

  resize();
  addEventListener("resize", resize);

  for (let i = 0; i < 70; i++) {
    parts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.2 - Math.random() * 0.4,
      r: 1 + Math.random() * 2
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    parts.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }

      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      g.addColorStop(0, "rgba(255,43,43,0.8)");
      g.addColorStop(1, "rgba(255,43,43,0)");
      ctx.fillStyle = g;
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(tick);
  }

  tick();
})();
