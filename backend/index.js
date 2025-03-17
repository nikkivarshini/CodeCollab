require("dotenv").config();
const { Server } = require("socket.io");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const http = require("http");
const path = require("path");
const axios = require("axios");

const app = express();
const db = require('./db');
const { env } = require("process");

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello, world!");
});


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;


const server = http.createServer(app);
const io = new Server(server, { cors: true });

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();
const screenSharingUsers = new Map(); // Track screen sharers per room

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        email: socketidToEmailMap.get(socketId),
      };
    }
  );
};

// // Fetch ChatGPT response for code clarification
// const getCodeClarificationResponse = async (userMessage, userCode) => {
  //   try {
    //     const response = await axios.post(
      //       "https://api.openai.com/v1/chat/completions",
      //       {
        //         model: "gpt-3.5-turbo",
        //         messages: [
//           {
//             role: "system",
//             content:
//               "You are a helpful assistant specializing in code clarification, debugging, and understanding code.",
//           },
//           {
  //             role: "user",
  //             content: `Here is the code I am working on: ${userCode}. I need help with: ${userMessage}`,
  //           },
  //         ],
  //         max_tokens: 250,
  //       },
  //       {
    //         headers: {
      //           "Content-Type": "application/json",
      //           Authorization: `Bearer ${OPENAI_API_KEY}`,
      //         },
      //       }
      //     );
      //     return response.data.choices[0].message.content.trim();
      //   } catch (error) {
        //     console.error("Error fetching from OpenAI:", error);
        //     return "Sorry, I couldn't process your request. Please try again later.";
        //   }
        // };
        app.use('/api/users/', require('./Routes/userRoutes'));
        app.get("/api/test", (req, res) => {
          res.json({ message: "API is working" });
        });
        
        // Chatbot endpoint
        app.post("/api/chat ", async (req, res) => {
          console.log("Received request:", req.body); // Log the incoming request
          const userMessage = req.body.message;
          
          if (!userMessage) {
            return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        max_tokens: 250,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    console.log("OpenAI Response:", response.data);
    
    const chatbotResponse = response.data.choices[0].message.content.trim();
    res.json({ response: chatbotResponse });
  } catch (error) {
    console.error("Error fetching response from OpenAI:", error);
    res.status(500).json({ error: "Failed to fetch chatbot response" });
  }  
});


io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);
  
  socket.on("room:join", ({ email, room }) => {
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    socket.join(room);
    console.log(`${email} (${socket.id}) joined room: ${room}`);
    io.to(socket.id).emit("room:join", { email, room });
    socket.to(room).emit("user:joined", { email, id: socket.id });

    const clients = getAllConnectedClients(room);
    io.to(room).emit("new", { clients });
  });


  socket.on("start-screen-share", ({ email }) => {
    const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

    if (!roomId) {
      console.error(`Room ID not found for socket ${socket.id}`);
      socket.emit("screen-share-error", "You must join a room before sharing the screen.");
      return;
    }

    // Prevent multiple people from sharing screens in the same room
    if (screenSharingUsers.has(roomId)) {
      socket.emit("screen-share-error", "Someone is already sharing the screen.");
      return;
    }

    screenSharingUsers.set(roomId, socket.id);
    io.to(roomId).emit("screen-share-started", { email, socketId: socket.id });

    console.log(`Screen sharing started by ${email} in room ${roomId}`);
  });

  socket.on("stop-screen-share", ({ email }) => {
    const roomId = Array.from(socket.rooms).find((room) => room !== socket.id);

    if (!roomId || !screenSharingUsers.has(roomId) || screenSharingUsers.get(roomId) !== socket.id) {
      socket.emit("screen-share-error", "You are not the one sharing the screen.");
      return;
    }

    screenSharingUsers.delete(roomId);
    io.to(roomId).emit("screen-share-stopped", { email });

    console.log(`Screen sharing stopped by ${email} in room ${roomId}`);
  });




  
  // Chat message handling
  socket.on("send_message", ({ roomId, email, message }) => {
    // Broadcast the message to all users in the room
    const chatMessage = { email, message, timestamp: new Date().toISOString() };
    io.to(roomId).emit("receive_message", chatMessage);
    console.log(`Message from ${email}: ${message}`);
  });
  
  socket.on("code:change", ({ roomId, code }) => {
    console.log("code", code);
    socket.in(roomId).emit("code:change", { code });
    console.log(roomId);
  });
  
  // For handling video off event
  socket.on("user:video:toggle", ({ to, isVideoOff, email }) => {
    console.log("user:video:toggle", to, isVideoOff, email);
    io.to(to).emit("remote:video:toggle", { isVideoOff, email });
  });
  
  socket.on("sync:code", ({ socketId, code }) => {
    io.to(socketId).emit("code:change", { code });
  });
  
  socket.on("user:call", ({ to, offer, email }) => {
    io.to(to).emit("incomming:call", {
      from: socket.id,
      offer,
      fromEmail: email,
    });
  });
  
  // Handling code output
  socket.on("output", ({ roomId, output }) => {
    console.log("output", output);
    socket.in(roomId).emit("output", { output });
  });
  
  socket.on("language:change", ({ roomId, language, snippet }) => {
    console.log(snippet, roomId);
    socket.in(roomId).emit("language:change", { language, snippet });
  });
  
  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });
  
  socket.on("peer:nego:needed", ({ to, offer }) => {
    console.log("peer:nego:needed", offer);
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });
  
  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });
  
  socket.on("leave:room", ({ roomId, email }) => {
    socket.leave(roomId);
    console.log(`${email} left ${roomId}`);
    socket.to(roomId).emit("user:left", { email });
  });
  
  socket.on("wait:for:call", ({ to, email }) => {
    console.log("wait:for:call", to, email);
    io.to(to).emit("wait:for:call", { from: socket.id, email });
  });
  
  socket.on("disconnecting", () => {
    io.emit("user:left", { id: socket.id });
    console.log(`Socket Disconnected: ${socket.id}`);
  });
});

app.use(express.static('../client/build'));
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'))
});

const PORT = process.env.PORT ;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
