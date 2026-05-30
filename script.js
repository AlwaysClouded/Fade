// =========================
// Config
// =========================

const DISCORD_ID = "1360925264669966338";

// =========================
// Lanyard WebSocket
// =========================

let lanyardWS;

function connectLanyard() {
  lanyardWS = new WebSocket("wss://api.lanyard.rest/socket");

  lanyardWS.onopen = () => {
    console.log("[Lanyard] Connected");

    // Subscribe to your user ID
    lanyardWS.send(JSON.stringify({
      op: 2,
      d: {
        subscribe_to_id: DISCORD_ID
      }
    }));
  };

  lanyardWS.onmessage = (event) => {
    const packet = JSON.parse(event.data);

    if (packet.t !== "INIT_STATE" && packet.t !== "PRESENCE_UPDATE") return;

    const d = packet.d;

    updateDiscord(d);
    updateSpotify(d);
  };

  lanyardWS.onclose = () => {
    console.log("[Lanyard] Disconnected, reconnecting in 3s...");
    setTimeout(connectLanyard, 3000);
  };

  lanyardWS.onerror = (err) => {
    console.error("[Lanyard] Error:", err);
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

    // Avatar
    const avatarUrl = d.discord_user.avatar
      ? `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.png?size=256`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    avatarEl.src = avatarUrl;

    // Username
    usernameEl.textContent = d.discord_user.username;

    // Status
    const statusMap = {
      online: { color: "#43b581", text: "Online" },
      idle: { color: "#faa61a", text: "Idle" },
      dnd: { color: "#f04747", text: "Do Not Disturb" },
      offline: { color: "#747f8d", text: "Offline" }
    };

    const s = statusMap[d.discord_status] || statusMap.offline;

    statusDotEl.style.background = s.color;
    statusTextEl.textContent = s.text;

    // Custom status (activity type 4)
    const custom = d.activities?.find(a => a.type === 4);
    customStatusEl.textContent = custom?.state || "No active custom status";
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

    if (!coverEl || !titleEl || !artistEl) {
      console.warn("[Spotify] Missing DOM elements");
      return;
    }

    if (!spotify) {
      coverEl.src = "https://i.imgur.com/8QfQFfC.png";
      titleEl.textContent = "Not playing anything";
      artistEl.textContent = "";
      return;
    }

    coverEl.src = spotify.album_art_url;
    titleEl.textContent = spotify.song;
    artistEl.textContent = spotify.artist;
  } catch (e) {
    console.error("[Spotify] updateSpotify error:", e);
  }
}

// =========================
// Optional: simple "music unlock" click
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const musicUnlockBtn = document.getElementById("music-unlock");
  const audio = document.getElementById("bg-audio");

  if (musicUnlockBtn && audio) {
    musicUnlockBtn.addEventListener("click", () => {
      audio.muted = false;
      audio.play().catch(() => {});
      musicUnlockBtn.style.display = "none";
    });
  }
});

// =========================
// Optional: simple particles (minimal)
// =========================

(function simpleParticles() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const particles = [];
  const count = 60;

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
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1 + Math.random() * 2
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(tick);
  }

  tick();
})();
