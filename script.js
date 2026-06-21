import express from "express";
import WebSocket from "ws";
import cors from "cors";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const USER_ID = "1360925264669966338";

let latestPresence = {
  status: "offline",
  customStatus: null,
  spotify: null,
  xbox: null,
  activities: []
};

const app = express();
app.use(cors());

app.get("/api/presence", (req, res) => {
  res.json({
    success: true,
    presence: latestPresence
  });
});

function connectGateway() {
  const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  ws.on("open", () => {
    console.log("[Gateway] Connected");

    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: DISCORD_TOKEN,
          intents: 1 << 8,
          properties: {
            os: "linux",
            browser: "custom",
            device: "custom"
          }
        }
      })
    );
  });

  ws.on("message", (msg) => {
    const packet = JSON.parse(msg);

    if (packet.op === 10) {
      const interval = packet.d.heartbeat_interval;
      setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: null }));
      }, interval);
    }

    if (packet.t === "PRESENCE_UPDATE" && packet.d.user.id === USER_ID) {
      const d = packet.d;

      const spotify = d.activities.find(a => a.type === 2) || null;
      const custom = d.activities.find(a => a.type === 4) || null;
      const xbox = d.activities.find(a => a.name === "Xbox") || null;

      latestPresence = {
        status: d.status,
        customStatus: custom?.state || null,
        spotify: spotify
          ? {
              song: spotify.details,
              artist: spotify.state,
              albumArt: spotify.assets?.large_image
                ? `https://i.scdn.co/image/${spotify.assets.large_image.replace("spotify:", "")}`
                : null
            }
          : null,
        xbox: xbox
          ? {
              game: xbox.details,
              state: xbox.state,
              cover: xbox.assets?.large_image
                ? `https://media.discordapp.net/${xbox.assets.large_image.replace("mp:", "")}`
                : null
            }
          : null,
        activities: d.activities
      };

      console.log("[Presence] Updated");
    }
  });

  ws.on("close", () => {
    console.log("[Gateway] Disconnected — reconnecting...");
    setTimeout(connectGateway, 3000);
  });

  ws.on("error", () => {
    console.log("[Gateway] Error — reconnecting...");
    setTimeout(connectGateway, 3000);
  });
}

connectGateway();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Presence API running on port " + PORT);
});
