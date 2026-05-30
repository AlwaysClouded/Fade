* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  height: 100vh;
  overflow: hidden;
  background: url("220c8083-b945-4b72-8d32-786de003d013.jpeg") center/cover no-repeat fixed;
  font-family: "Segoe UI", sans-serif;
}

/* Particle canvas */
#particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* Center Card */
.card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 380px;
  padding: 30px;
  text-align: center;

  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(14px);

  border-radius: 18px;
  border: 2px solid rgba(255, 60, 60, 0.45);

  box-shadow:
    0 0 25px rgba(255, 40, 40, 0.6),
    0 0 60px rgba(255, 0, 0, 0.35);

  animation: cardFlicker 4s infinite;
  z-index: 2;
}

/* ——— SPOTIFY NOW PLAYING BAR ——— */
#spotify-bar {
  position: absolute;
  bottom: 150px;
  left: 50%;
  transform: translateX(-50%);
  width: 340px;

  padding: 14px;
  border-radius: 14px;

  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);

  border: 2px solid rgba(30, 215, 96, 0.45);
  box-shadow:
    0 0 20px rgba(30, 215, 96, 0.5),
    0 0 40px rgba(30, 215, 96, 0.3);

  display: flex;
  gap: 12px;
  align-items: center;

  opacity: 1; /* ALWAYS visible */
}

#spotify-cover {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  border: 2px solid #1ed760;
}

.spotify-info h3 {
  margin: 0;
  color: #1ed760;
  font-size: 1rem;
  font-weight: 700;
}

.spotify-info p {
  margin: 0;
  color: #e0e0e0;
  font-size: 0.85rem;
  opacity: 0.9;
}

/* ——— DISCORD PROFILE PANEL ——— */
#discord-profile {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 340px;

  padding: 20px;
  border-radius: 16px;

  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(12px);

  border: 2px solid rgba(255, 60, 60, 0.45);
  box-shadow:
    0 0 25px rgba(255, 40, 40, 0.6),
    0 0 60px rgba(255, 0, 0, 0.35);

  display: flex;
  gap: 15px;
  align-items: center;
}

#dp-avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: 3px solid #ff3c3c;
}

.dp-info h2 {
  margin: 0;
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: 700;
}

.dp-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

#dp-status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: gray;
}

#dp-status-text {
  margin: 0;
  color: #cfcfcf;
  font-size: 0.9rem;
}

.dp-custom {
  margin-top: 6px;
  color: #bfbfbf;
  font-size: 0.85rem;
  opacity: 0.9;
}

/* Red scanline overlay */
body::after {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: repeating-linear-gradient(
    rgba(255, 0, 0, 0.05) 0px,
    rgba(255, 0, 0, 0.05) 2px,
    transparent 3px,
    transparent 4px
  );
  mix-blend-mode: overlay;
  animation: scan 6s linear infinite;
}

@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
