var express = require("express");
var path = require("path");
const cors = require("cors");
const config = require("./config");

var app = express();
const port = config.PORT;
const http = require("http");
const { Server } = require("socket.io");
const gameUserBridge = require("../../gameUserBridge.js");

const { selectFrame, RandomResult, addGameHistory, allUserHistory, addBet, coin, historyRecord } = require("./service");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const defaultSettings = {
  game: [
    { name: "casino", minWinPercent: 25, maxWinPercent: 100 },
    { name: "roulette", minWinPercent: 25, maxWinPercent: 100 },
  ],
  coinForGameAnnouncement: 1000,
  gameCoin: [100, 200, 300, 400, 500],
  roulette_gameRule:
    "Roulette Game Rules: Place your bets on numbers, colors, or combinations. When the timer ends, the wheel spins and winners are rewarded based on payouts!",
};

// Settings API endpoint for frontend
app.get("/setting", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Settings fetched successfully",
    setting: global.setting || defaultSettings,
  });
});

app.get("/*", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const refreshSettings = async () => {
  try {
    const settings = await gameUserBridge.getGameSettings("roulettecasino", defaultSettings);
    global.setting = settings || defaultSettings;
  } catch (error) {
    console.error("Error fetching settings:", error);
    global.setting = defaultSettings;
  }
};

process.on("unhandledRejection", (err) => {
  console.log(err?.name, err?.message);
});

// Initialize settings
refreshSettings();

// Game Loop For Timer
setInterval(() => {
  updateTime();
}, 1000);

global.bet = [];
let time = 21;
let randomWinnerNumber;
global.highOrLowWinResult = [];
global.resultObj;
global.settinData = {};
global.currentGame = {
  Combinations: 9,
  UsersBits: [],
  cardBitCoin: [
    { selectFrame: 1, bit: 0, winner: false },
    { selectFrame: 2, bit: 0, winner: false },
    { selectFrame: 3, bit: 0, winner: false },
    { selectFrame: 4, bit: 0, winner: false },
    { selectFrame: 5, bit: 0, winner: false },
    { selectFrame: 6, bit: 0, winner: false },
    { selectFrame: 7, bit: 0, winner: false },
    { selectFrame: 8, bit: 0, winner: false },
  ],
  resultObj: { no: 34, color: "red", oddAndEven: "even" },
};

io.on("connection", async (socket) => {
  const { globalRoom } = socket?.handshake?.query;
  const targetUserId = globalRoom && globalRoom !== "null" && globalRoom !== "undefined" ? globalRoom : "1";

  let user = null;
  if (globalRoom && globalRoom !== "null" && globalRoom !== "undefined") {
    try {
      user = await gameUserBridge.getUser(globalRoom);
    } catch (_) {}
  }

  if (!user) {
    user = {
      _id: String(targetUserId),
      id: parseInt(targetUserId, 10) || 1,
      name: "Player " + targetUserId,
      username: "player_" + targetUserId,
      diamond: 10000,
      coins: 10000,
      balance: 10000,
    };
  }

  socket.on("startGame", async (obj) => {
    if (globalRoom && globalRoom !== "null" && globalRoom !== "undefined") {
      try {
        const freshUser = await gameUserBridge.getUser(globalRoom);
        if (freshUser) user = freshUser;
      } catch (_) {}
    }
    if (user) {
      socket.emit("start", user);
      io.emit("game", currentGame);
      const recentOutcomes = await gameUserBridge.getLastWinningOutcomes("roulettecasino", 20);
      socket.emit("gameNumberHistory", recentOutcomes);
    } else {
      socket.emit("start", null);
    }
  });

  socket.on("bit", async (obj) => {
    const bitAmount = parseInt(obj.Bit, 10) || 0;
    const uid = obj.User?._id || obj.User?.id || globalRoom;

    await gameUserBridge.deductCoins(uid, bitAmount, 'roulettecasino', 'Bet on Roulette Casino');
    const userDb = await gameUserBridge.getUser(uid);
    if (userDb) {
      user = userDb;
      socket.emit("start", userDb);
    }

    var objToModify = currentGame.cardBitCoin.find((val) => val.selectFrame === obj.SelectedFrame);
    if (objToModify) {
      objToModify.bit += obj.Bit;
    }

    let bitData = {
      UserId: uid,
      Bit: obj.Bit,
      SelectedFrame: obj.SelectedFrame,
      position: obj.position,
    };
    currentGame.UsersBits.push(bitData);
    addBet(obj.Bit, uid);
    await gameUserBridge.updateAdminCoin('roulettecasino', obj.Bit);
    io.emit("bit", bitData);
  });

  socket.on("historyRecord", async () => {
    let historyRecordResult = await historyRecord(globalRoom);
    socket.emit("historyRecord", historyRecordResult);
  });

  socket.on("user", async (obj) => {
    const uid = obj.User?._id || obj.User?.id;
    if (uid) {
      const userDb = await gameUserBridge.getUser(uid);
      if (userDb && userDb.diamond !== obj.User?.diamond) {
        socket.emit("start", userDb);
      }
    }
  });

  socket.on("disconnect", () => {});
});

const updateTime = async () => {
  io.emit("time", time);
  time--;
  if (time === -1) {
    randomWinnerNumber = await RandomResult();
    resultObj = await selectFrame(randomWinnerNumber);
    await addGameHistory(resultObj);
  }
  if (time === -2) {
    currentGame.Combinations = randomWinnerNumber;
    io.emit("randomWinnerNumber", randomWinnerNumber);
  }
  if (time === -7) {
    currentGame.resultObj = resultObj.resultObj;
    io.emit("game", currentGame);
    const recentOutcomes = await gameUserBridge.getLastWinningOutcomes("roulettecasino", 20);
    io.emit("gameNumberHistory", recentOutcomes);
  }
  if (time === -5) {
    allUserHistory(currentGame, resultObj);
  }
  if (time === -13) {
    currentGame.UsersBits = [];
    currentGame.cardBitCoin = [
      { selectFrame: 1, bit: 0, winner: false },
      { selectFrame: 2, bit: 0, winner: false },
      { selectFrame: 3, bit: 0, winner: false },
      { selectFrame: 4, bit: 0, winner: false },
      { selectFrame: 5, bit: 0, winner: false },
      { selectFrame: 6, bit: 0, winner: false },
      { selectFrame: 7, bit: 0, winner: false },
      { selectFrame: 8, bit: 0, winner: false },
    ];
    io.emit("game", currentGame);
  }
  if (time === -16) {
    time = 21;
    bet.splice(0, bet.length);
    refreshSettings();
  }
};

server.listen(port, () => {
  console.log(`[Roulette Casino] Server running on port: ${port} (MySQL mode)`);
});
