const http = require("http");
const express = require('express');
const {RtcTokenBuilder, RtcRole} = require('agora-access-token');
// const process = require('dotenv');
// const path = require('path');
const dotenv = require('dotenv').config();
// const { Server } = require("socket.io");
const https = require('https');
const fs = require('fs');

const app = require("./app");
const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: ["*"],    
//     credentials: true,
//   },
//   allowEI03 : true
// })

// console.log(process.env)
const PORT = 3000;

server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
