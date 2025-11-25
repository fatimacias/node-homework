const EventEmitter = require("events");
const emitter = new EventEmitter();

emitter.on("time", (currentTime) => {
  console.log("Time received:", currentTime);
});

setInterval(() => {
  const now = new Date().toString();
  emitter.emit("time", now);
}, 5000);

// IMPORTANT: Export emitter so test can inspect it
module.exports = emitter;
