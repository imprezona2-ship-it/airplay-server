import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(join(__dirname, "public")));

// --- Estado en memoria (suficiente para MVP) ---
// rooms = { CODE: { screenId, players: { socketId: {name, color} } } }
const rooms = {};

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (rooms[code]);
  return code;
}

const COLORS = ["#ff4d6d", "#4dd0ff", "#ffd166", "#6bff95", "#c77dff", "#ff9f1c"];

io.on("connection", (socket) => {
  // --- LA PANTALLA crea una sala ---
  socket.on("screen:create", async () => {
    const code = makeCode();
    rooms[code] = { screenId: socket.id, players: {} };
    socket.join(code);
    socket.data.role = "screen";
    socket.data.code = code;

    // URL que escanea el jugador. En LAN reemplazá por tu IP local.
    const base = process.env.PUBLIC_URL || "";
    const joinUrl = `${base}/controller.html?code=${code}`;
    const qr = await QRCode.toDataURL(joinUrl, { margin: 1 });

    socket.emit("screen:created", { code, joinUrl, qr });
  });

  // --- UN JUGADOR se une desde el celular ---
  socket.on("player:join", ({ code, name }) => {
    code = (code || "").toUpperCase();
    const room = rooms[code];
    if (!room) {
      socket.emit("player:error", { message: "Sala no encontrada" });
      return;
    }
    const color = COLORS[Object.keys(room.players).length % COLORS.length];
    room.players[socket.id] = { name: name || "Jugador", color };
    socket.join(code);
    socket.data.role = "player";
    socket.data.code = code;

    socket.emit("player:joined", { code, color });
    io.to(room.screenId).emit("screen:players", Object.entries(room.players).map(
      ([id, p]) => ({ id, ...p })
    ));
  });

  // --- INPUT del control -> reenviado a la pantalla ---
  socket.on("player:input", (payload) => {
    const code = socket.data.code;
    const room = rooms[code];
    if (!room) return;
    io.to(room.screenId).emit("screen:input", {
      id: socket.id,
      player: room.players[socket.id],
      ...payload,
    });
  });

  // --- MENSAJE de la pantalla -> a un control o a todos ---
  socket.on("screen:message", ({ to, data }) => {
    const code = socket.data.code;
    if (!rooms[code]) return;
    if (to) io.to(to).emit("controller:message", data);
    else socket.to(code).emit("controller:message", data);
  });

  socket.on("disconnect", () => {
    const code = socket.data.code;
    const room = rooms[code];
    if (!room) return;
    if (socket.data.role === "screen") {
      // se cae la pantalla -> cerramos la sala
      io.to(code).emit("controller:message", { type: "room_closed" });
      delete rooms[code];
    } else if (socket.data.role === "player") {
      delete room.players[socket.id];
      io.to(room.screenId).emit("screen:players", Object.entries(room.players).map(
        ([id, p]) => ({ id, ...p })
      ));
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n  AirPlay MVP escuchando en http://localhost:${PORT}`);
  console.log(`  Pantalla:  http://localhost:${PORT}/`);
  console.log(`  Control:   http://localhost:${PORT}/controller.html\n`);
});
