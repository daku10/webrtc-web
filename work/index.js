"use strict";

var os = require("os");
var nodeStatic = require("node-static");
var http = require("http");
var socketIO = require("socket.io");

var fileServer = new nodeStatic.Server();
var app = http
  .createServer(function (req, res) {
    fileServer.serve(req, res);
  })
  .listen(8080);

var io = socketIO.listen(app);
io.sockets.on("connection", function (socket) {
  // convenience function to log server messages on the clinet
  function log() {
    var array = ["Message from server:"];
    array.push.apply(array, arguments);
    socket.emit("log", array);
  }

  socket.on("message", function (message) {
    log("Client said: ", message);
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit("message", message);
  });

  socket.on("create or join", function (room) {
    log(`Received request to create to join room ${room}`);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom
      ? Object.keys(clientsInRoom.sockets).length
      : 0;
    log(`Room ${room} now has ${numClients} client(s)`);

    if (numClients === 0) {
      socket.join(room);
      log(`Client ID ${socket.id} created room ${room}`);
      socket.emit("created", room, socket.id);
    } else if (numClients === 1) {
      log(`Client ID ${socket.id} joined room ${room}`);
      // io.sockets.in(room).emit('join', room);
      console.log("joined!!");
      socket.join(room);
      socket.emit("joined", room, socket.id);
      io.sockets.in(room).emit("ready", room);
      socket.broadcast.emit("ready", room);
    } else {
      socket.emit("full", room);
    }
  });

  socket.on("ipaddr", function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === "IPv4" && details.address !== "127.0.0.1") {
          socket.emit("ipaddr", details.address);
        }
      });
    }
  });

  socket.on("disconnect", function (reason) {
    console.log(`Peer or server disconnected. Reason: ${reason}.`);
    socket.broadcast.emit("bye");
  });

  socket.on("bye", function (room) {
    console.log(`Peer said bye on room ${room}.`);
  });
});
