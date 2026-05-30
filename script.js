// Particle effect (unchanged)
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];

for (let i = 0; i < 120; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2,
    speed: Math.random() * 1 + 0.2
  });
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.y += p.speed;
    if (p.y > canvas.height) p.y = 0;

    ctx.fillStyle = "rgba(255, 60, 60, 0.85)";
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  requestAnimationFrame(animate);
}

animate();

// Music unlock
const bgm = document.getElementById("bgm");
let started = false;

function startMusic() {
  if (!started) {
    bgm.volume = 0.4;
    bgm.play().catch(() => {});
    started = true;
  }
}

window.addEventListener("click", startMusic);
window.addEventListener("keydown", startMusic);

// ——— DISCORD PROFILE PANEL ———

const DISCORD_ID = "1360925264669966338";

async function loadDiscordProfile() {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
  const data = await res.json();
  if (!data.success) return;

  const d = data.data;

  // Avatar
  const avatar = `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${d.discord_user.avatar}.png?size=256`;
  document.getElementById("dp-avatar").src = avatar;

  // Username
  document.getElementById("dp-username").textContent =
    d.discord_user.username;

  // Status dot + text
  const dot = document.getElementById("dp-status-dot");
  const text = document.getElementById("dp-status-text");

  const statusMap = {
    online: { color: "#43b581", text: "Online" },
    idle: { color: "#faa61a", text: "Idle" },
    dnd: { color: "#f04747", text: "Do Not Disturb" },
    offline: { color: "#747f8d", text: "Offline" }
  };

  const s = statusMap[d.discord_status] || statusMap.offline;

  dot.style.background = s.color;
  dot.style.boxShadow = `0 0 10px ${s.color}`;
  text.textContent = s.text;

  // Custom status
  const custom = d.activities.find(a => a.type === 4);
  document.getElementById("dp-custom-status").textContent =
    custom ? custom.state : "No custom status";
}

loadDiscordProfile();
setInterval(loadDiscordProfile, 8000);
