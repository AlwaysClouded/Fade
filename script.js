// =========================
// Config
// =========================

const DISCORD_ID = "1360925264669966338";

// =========================
// Utility: log to panel
// =========================

function logLine(text) {
  const log = document.getElementById("log-output");
  if (!log) return;
  const span = document.createElement("span");
  span.className = "log-line";
  span.textContent = text;
  log.appendChild(span);
  while (log.children.length > 8) {
    log.removeChild(log.firstChild);
  }
}

// =========================
// Lanyard WebSocket
// =========================

let lanyardWS;

function connectLanyard() {
  lanyardWS = new WebSocket("wss://api.lanyard.rest/socket");

  lanyardWS.onopen = () => {
    logLine("[Lanyard] Connected");
    lanyardWS.send(
      JSON.stringify({
        op: 2,
        d: {
          subscribe_to_id: DISCORD_ID
        }
      })
    );
  };

  lanyardWS.onmessage = (event) => {
    const packet = JSON.parse(event.data);

    if (packet.t !== "INIT_STATE" && packet.t !== "PRESENCE_UPDATE") return;

    const d = packet.d;

    updateDiscord(d);
    updateSpotify(d);
  };

  lanyardWS.onclose = () => {
    logLine("[Lanyard] Disconnected, reconnecting in 3s...");
    setTimeout(connectLanyard, 3000);
  };

  lanyardWS.onerror = (err) => {
    console.error("[Lanyard] Error:", err);
    logLine("[Lanyard] Error (see console)");
  };
}

connectLanyard();

// =========================
// Discord Panel
// =========================

function updateDiscord(d) {
  try {
    const avatarEl = document.getElementById("dp-avatar");
    const usernameEl = document.getElementById("dp-username");
    const statusDotEl = document.getElementById("dp-status-dot");
    const statusTextEl = document.getElementById("dp-status-text");
    const customStatusEl = document.getElementById("dp-custom-status");

    if (!avatarEl || !usernameEl || !statusDotEl || !statusTextEl || !customStatusEl) {
      console.warn("[Discord] Missing DOM elements");
      return;
    }

    const avatarUrl = d.discord_user.avatar
      ? `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    avatarEl.src = avatarUrl;
    usernameEl.textContent = d.discord_user.username;

    const statusMap = {
      online: { color: "#43b581", text: "Online" },
      idle: { color: "#faa61a", text: "Idle" },
      dnd: { color: "#f04747", text: "Do Not Disturb" },
      offline: { color: "#747f8d", text: "Offline" }
    };

    const s = statusMap[d.discord_status] || statusMap.offline;

    statusDotEl.style.background = s.color;
    statusTextEl.textContent = s.text;

    const custom = d.activities?.find((a) => a.type === 4);
    customStatusEl.textContent = custom?.state || "No active custom status";

    logLine(`[Discord] ${d.discord_user.username} is ${s.text}`);
  } catch (e) {
    console.error("[Discord] updateDiscord error:", e);
  }
}

// =========================
// Spotify Panel
// =========================

function updateSpotify(d) {
  try {
    const spotify = d.spotify;

    const coverEl = document.getElementById("spotify-cover");
    const titleEl = document.getElementById("spotify-title");
    const artistEl = document.getElementById("spotify-artist");
    const spotifyPanel = document.querySelector(".panel-spotify");

    if (!coverEl || !titleEl || !artistEl || !spotifyPanel) {
      console.warn("[Spotify] Missing DOM elements");
      return;
    }

    if (!spotify) {
      coverEl.src = "https://i.imgur.com/8QfQFfC.png";
      titleEl.textContent = "Not playing anything";
      artistEl.textContent = "";
      spotifyPanel.classList.remove("active");
      logLine("[Spotify] Idle");
      return;
    }

    coverEl.src = spotify.album_art_url;
    titleEl.textContent = spotify.song;
    artistEl.textContent = spotify.artist;
    spotifyPanel.classList.add("active");

    logLine(`[Spotify] ${spotify.song} — ${spotify.artist}`);
  } catch (e) {
    console.error("[Spotify] updateSpotify error:", e);
  }
}

// =========================
// Music unlock
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const musicUnlockBtn = document.getElementById("music-unlock");
  const audio = document.getElementById("bg-audio");

  if (musicUnlockBtn && audio) {
    musicUnlockBtn.addEventListener("click", () => {
      audio.muted = false;
      audio
        .play()
        .then(() => {
          logLine("[Audio] Blood rush unmuted");
        })
        .catch(() => {
          logLine("[Audio] Autoplay blocked");
        });
      musicUnlockBtn.style.display = "none";
    });
  }
});

// =========================
// Simple particles (embers)
// =========================

(function simpleParticles() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const particles = [];
  const count = 70;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.2 - Math.random() * 0.4,
      r: 1 + Math.random() * 2,
      alpha: 0.2 + Math.random() * 0.6
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }

      ctx.beginPath();
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grd.addColorStop(0, `rgba(255, 80, 80, ${p.alpha})`);
      grd.addColorStop(1, "rgba(255, 80, 80, 0)");
      ctx.fillStyle = grd;
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(tick);
  }

  tick();
})();

// =========================
// Parallax on mouse (subtle)
// =========================

(function parallax() {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  document.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;

    hero.style.transform = `translate3d(${dx * 10}px, ${dy * 10}px, 0)`;
  });

  document.addEventListener("mouseleave", () => {
    hero.style.transform = "translate3d(0, 0, 0)";
  });
})();
