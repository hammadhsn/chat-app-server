// index.js

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", //frontend URL
    methods: ["GET", "POST"],
  },
});
const PORT = 5000;

app.use(cors());
app.use(express.json());

// In-memory store for users and chat rooms
const users = {};
const rooms = {};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api", (req, res) => {
  res.json({ message: "Welcome to the API!" });
});

// Socket.io setup
io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Handle user joining
  socket.on("join", ({ username, room }) => {
    users[socket.id] = username;
    if (room) {
      socket.join(room);
      if (!rooms[room]) rooms[room] = [];
      rooms[room].push(username);
      io.to(room).emit("message", {
        user: "admin",
        text: `${username} has joined the room.`,
      });
    }
    console.log(`User ${username} joined room: ${room}`);
  });

  // Handle sending messages
  socket.on("sendMessage", ({ message, room }) => {
    const user = users[socket.id];
    if (room) {
      io.to(room).emit("message", { user, text: message });
    } else {
      io.emit("message", { user, text: message });
    }
  });

  // Handle typing event
  socket.on("typing", ({ room }) => {
    const user = users[socket.id];
    if (room) {
      socket.to(room).emit("typing", { user });
    } else {
      socket.broadcast.emit("typing", { user });
    }
  });

  // Handle stop typing event
  socket.on("stopTyping", ({ room }) => {
    const user = users[socket.id];
    if (room) {
      socket.to(room).emit("stopTyping", { user });
    } else {
      socket.broadcast.emit("stopTyping", { user });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const user = users[socket.id];
    delete users[socket.id];
    for (const room in rooms) {
      rooms[room] = rooms[room].filter((username) => username !== user);
      if (rooms[room].length === 0) delete rooms[room];
      io.to(room).emit("message", {
        user: "admin",
        text: `${user} has left the room.`,
      });
    }
    console.log(`User ${user} disconnected.`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
