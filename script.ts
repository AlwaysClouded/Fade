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
