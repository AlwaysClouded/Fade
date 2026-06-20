const DISCORD_ID = "1360925264669966338";

let ws;
let lastStatus = null;
let lastTrackId = null;
let lastXboxState = null;

// -----------------------------
// LOGGING
// -----------------------------
function logLine(text: string) {
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

connectLanyard();

// -----------------------------
// HANDLE PRESENCE + DEBUG LOGGING
// -----------------------------
function handlePresence(d: any, tag: string) {
  logLine(`${tag} Presence received`);

  // ⭐ FULL DEBUG LOGGING ⭐
  logLine("[DEBUG] Activities: " + JSON.stringify(d.activities || []));
  logLine("[DEBUG] Spotify: " + JSON.stringify(d.spotify || null));
  logLine("[DEBUG] Status: " + d.discord_status);
  logLine("[DEBUG] Xbox: " + JSON.stringify(d.activities?.find((a: any) => a.name === "Xbox") || null));

  updateDiscord(d);
  updateSpotify(d);
  updateXbox(d);

  logLine(`${tag} Presence processed`);
}

// -----------------------------
// DISCORD UPDATE
// -----------------------------
function updateDiscord(d: any) {
  if (!d || !d.discord_user) return;

  const avatarEl = document.getElementById("dp-avatar") as HTMLImageElement;
  if (d.discord_user.avatar) {
    const ext = d.discord_user.avatar.startsWith("a_") ? "gif" : "png";
    avatarEl.src = `https://cdn.discordapp.com/avatars/${d.discord_user.id}/${d.discord_user.avatar}.${ext}?size=128`;
  } else {
    avatarEl.src = "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  (document.getElementById("dp-username") as HTMLElement).textContent =
    d.discord_user.global_name || d.discord_user.username;

  const statusMap: any = {
    online: { color: "#43b581", text: "Online" },
    idle: { color: "#faa61a", text: "Idle" },
    dnd: { color: "#f04747", text: "Do Not Disturb" },
    offline: { color: "#747f8d", text: "Offline" }
  };

  const s = statusMap[d.discord_status] || statusMap.offline;

  const dot = document.getElementById("dp-status-dot") as HTMLElement;
  dot.style.background = s.color;
  dot.style.boxShadow = `0 0 8px ${s.color}`;

  (document.getElementById("dp-status-text") as HTMLElement).textContent = s.text;

  const custom = d.activities?.find((a: any) => a.type === 4);
  (document.getElementById("dp-custom-status") as HTMLElement).textContent =
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
  document.getElementById("spotify-cover")?.classList.add("fade-out");
  document.getElementById("spotify-title")?.classList.add("fade-out");
  document.getElementById("spotify-artist")?.classList.add("fade-out");
}

function fadeInSpotify() {
  document.getElementById("spotify-cover")?.classList.remove("fade-out");
  document.getElementById("spotify-title")?.classList.remove("fade-out");
  document.getElementById("spotify-artist")?.classList.remove("fade-out");
}

function updateSpotify(d: any) {
  const s = d.spotify;
  const cover = document.getElementById("spotify-cover") as HTMLImageElement;
  const title = document.getElementById("spotify-title") as HTMLElement;
  const artist = document.getElementById("spotify-artist") as HTMLElement;
  const panel = document.querySelector(".panel-spotify") as HTMLElement;

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
function updateXbox(d: any) {
  const xbox = d.activities?.find((a: any) => a.name === "Xbox");

  const cover = document.getElementById("xbox-cover") as HTMLImageElement;
  const title = document.getElementById("xbox-title") as HTMLElement;
  const details = document.getElementById("xbox-details") as HTMLElement;
  const panel = document.querySelector(".panel-xbox") as HTMLElement;

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
