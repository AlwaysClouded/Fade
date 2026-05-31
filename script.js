const DISCORD_ID = "1360925264669966338";

function logLine(text) {
  const log = document.getElementById("log-output");
  if (!log) return;
  const span = document.createElement("span");
  span.className = "log-line";
  span.textContent = text;
  log.appendChild(span);
  while (log.children.length > 5) log.removeChild(log.firstChild);
}

let ws;

function connect() {
  ws = new WebSocket("wss://api.lanyard.rest/socket");

  ws.onopen = () => {
    logLine("[Lanyard] Connected to gateway");
    ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
  };

  ws.onmessage = (e) => {
    const p = JSON.parse(e.data);
    let userData = null;

    if (p.t === "INIT_STATE") {
      userData = p.d[DISCORD_ID];
    } else if (p.t === "PRESENCE_UPDATE") {
      userData = p.d;
    }

    if (userData) {
      updateDiscord(userData);
      updateSpotify(userData);
    }
  };

  ws.onclose = () => {
    logLine("[Lanyard] Disconnected, retrying...");
    setTimeout(connect, 3000);
  };
}

connect();

function updateDiscord(d) {
  if (!d || !d.discord_user) return;

  const avatarEl = document.getElementById("dp-avatar");
  if (d.discord_user.avatar) {
    const ext = d.discord_user.avatar.startsWith("a_") ? "gif" : "png";
    avatarEl.src = `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.${ext}?size=128`;
  } else {
    avatarEl.src = "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  document.getElementById("dp-username").textContent = d.discord_user.global_name || d.discord_user.username;

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
  document.getElementById("dp-custom-status").textContent = custom?.state || "No active custom status";

  logLine(`[Discord] Status updated to ${s.text.toUpperCase()}`);
}

function updateSpotify(d) {
  const s = d.spotify;
  const cover = document.getElementById("spotify-cover");
  const title = document.getElementById("spotify-title");
  const artist = document.getElementById("spotify-artist");
  const panel = document.querySelector(".panel-spotify");

  if (!s) {
    cover.src = "https://i.imgur.com/8QfQFfC.png";
    title.textContent = "Not playing anything";
    artist.textContent = "";
    if (panel) panel.classList.remove("active");
    logLine("[Spotify] Session idle");
    return;
  }

  cover.src = s.album_art_url;
  title.textContent = s.song;
  artist.textContent = s.artist;
  if (panel) panel.classList.add("active");

  logLine(`[Spotify] ${s.song} — ${s.artist}`);
}

const unlockBtn = document.getElementById("music-unlock");
if(unlockBtn) {
  unlockBtn.onclick = () => {
    const audio = document.getElementById("bg-audio");
    if (audio) {
      audio.muted = false;
      audio.play().catch(() => { logLine("[Audio] Playback blocked by browser"); });
    }
    unlockBtn.style.display = "none";
    logLine("[Audio] Blood rush unmuted");
  };
}

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
