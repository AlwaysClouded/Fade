// Particle effect
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

// Background music unlock
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

// Discord Live Status Panel
const DISCORD_ID = "1360925264669966338";

async function loadDiscord() {
  const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
  const data = await res.json();

  if (!data.success) return;

  const d = data.data;

  // Avatar
  const avatar = `https://cdn.discordapp.com/avatars/${DISCORD_ID}/${d.discord_user.avatar}.png?size=256`;
  document.getElementById("discord-avatar").src = avatar;

  // Username
  document.getElementById("discord-username").textContent =
    d.discord_user.username + "#" + d.discord_user.discriminator;

  // Status
  const statusMap = {
    online: "🟢 Online",
    idle: "🟡 Idle",
    dnd: "🔴 Do Not Disturb",
    offline: "⚫ Offline"
  };

  document.getElementById("discord-status").textContent =
    statusMap[d.discord_status] || "Unknown";
}

loadDiscord();
setInterval(loadDiscord, 8000);
