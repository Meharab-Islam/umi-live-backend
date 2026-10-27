const path = require("path");
const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { cardUpdateSplice, win, allUserHistory, gameAdminCoin } = require("./service.js");
const config = require('./config.js');
const gameUserBridge = require("../../gameUserBridge.js");

global.highBitValue = 0;
global.midBitValue = 0;
global.lowBitValue = 0;

app.use(cors());

// Settings API endpoint for frontend
app.get("/setting", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Settings fetched successfully",
    setting: global.setting || {
      game: [
        { name: "teenpatti", minWinPercent: 50, maxWinPercent: 80 }
      ],
      coinForGameAnnouncement: 1000,
      gameCoin: [2000, 5000, 10000, 20000, 50000]
    },
  });
});

const server = http.createServer(app);

// Setup for server and socket.io
const LISTER_PORT = config.PORT;
const io = new Server(server, {
  cors: {
    methods: ["GET", "POST"],
  },
});

const defaultSettings = {
  game: [{ name: "teenpatti", minWinPercent: 50, maxWinPercent: 80 }],
  coinForGameAnnouncement: 1000,
  gameCoin: [2000, 5000, 10000, 20000, 50000],
};

const refreshSettings = async () => {
  try {
    const settings = await gameUserBridge.getGameSettings("teenpatti", defaultSettings);
    global.setting = settings || defaultSettings;
  } catch (error) {
    console.error("Error refreshing settings:", error);
    global.setting = defaultSettings;
  }
};

const indexRoute = require("./routes/routeIndex.js");
app.use("/", indexRoute);

let activeUsers = [];
let time = 21;
let currentGame = {
  Combinations: [
    { combination: [40, 28, 7, "HighCard"], value: 59 },
    { combination: [15, 29, 4, "Sequence"], value: 36 },
    { combination: [20, 21, 19, "Pure"], value: 20 },
  ],
  UsersBits: [],
  cardBitCoin: [
    { selectFrame: 1, bit: 0, card: "", winner: false },
    { selectFrame: 2, bit: 0, card: "", winner: false },
    { selectFrame: 3, bit: 0, card: "", winner: false },
  ],
};

// Game Loop For Timer
setInterval(() => {
  updateTime();
}, 1000);

// Initialize settings and launch
refreshSettings();

// Initializing the socket io connection
io.on("connection", async (socket) => {
  let user = null;
  const rawUserId = socket.handshake.query.userId;
  const userId = rawUserId && rawUserId !== "null" && rawUserId !== "undefined" ? rawUserId : "1";

  if (rawUserId && rawUserId !== "null" && rawUserId !== "undefined") {
    try {
      user = await gameUserBridge.getUser(rawUserId);
    } catch (err) {
      console.log("Real user lookup note:", err.message);
    }
  }

  if (!user) {
    user = {
      _id: String(userId),
      id: parseInt(userId, 10) || 1,
      name: "Player " + userId,
      username: "player_" + userId,
      diamond: 10000,
      coins: 10000,
      balance: 10000,
      gameBlock: false,
    };
  }

  // Start game
  socket.on("startGame", async (obj) => {
    if (rawUserId && rawUserId !== "null" && rawUserId !== "undefined") {
      try {
        const freshUser = await gameUserBridge.getUser(rawUserId);
        if (freshUser) user = freshUser;
      } catch (_) {}
    }

    if (user && user.gameBlock) {
      socket.emit("block", user);
      user = {};
    } else {
      if (user) {
        socket.emit("start", user);
        if (!activeUsers.some((u) => u.SocketId === socket.id)) {
          activeUsers.push({ User: user, SocketId: socket.id });
        }
        getTop5Users();
        io.emit("game", currentGame);
      } else {
        socket.emit("start", null);
      }
    }
  });

  // Get User
  socket.on("user", async (obj) => {
    if (obj.User?._id || obj.User?.id) {
      const uid = obj.User._id || obj.User.id;
      const finalUser = await gameUserBridge.getUser(uid);
      if (finalUser && finalUser.diamond !== obj.User?.diamond) {
        socket.emit("start", finalUser);
      }
    }
  });

  // Bit
  socket.on("bit", async (obj) => {
    const bitAmount = parseInt(obj.Bit, 10) || 0;
    const uid = obj.User?._id || obj.User?.id || userId;

    await gameUserBridge.deductCoins(uid, bitAmount, 'teenpatti', 'Bet on Teen Patti');
    const userDb = await gameUserBridge.getUser(uid);
    if (userDb) {
      user = userDb;
      socket.emit("start", userDb);
    }

    var objToModify = currentGame.cardBitCoin.find(
      (val) => val.selectFrame === obj.SelectedFrame
    );

    if (objToModify) {
      objToModify.bit += obj.Bit;
    }

    currentGame.UsersBits.push({
      UserId: uid,
      Bit: obj.Bit,
      SelectedFrame: obj.SelectedFrame,
      Left: Math.random() * 55 + 5,
      Top: Math.random() * 45 + 0,
    });
    addBet(obj.Bit, uid);
    io.emit("game", currentGame);
    io.emit("bit");

    await gameUserBridge.updateAdminCoin('teenpatti', bitAmount);
  });

  // When the user exits the room
  socket.on("disconnect", () => {
    getTop5Users();
    io.emit("game", currentGame);
    activeUsers = activeUsers.filter((obj) => obj.SocketId !== socket.id);
  });
});

var bet = [];

const updateTime = async () => {
  io.emit("time", time);
  time--;
  if (time == 0) {
    let winResult = await win(currentGame);
    currentGame.Combinations = winResult.combination;
    allUserHistory(currentGame, winResult.winnerIndex);
  }

  if (time == 1) {
    currentGame.Combinations = await cardUpdateSplice(currentGame, time);
  }
  if (time == -9) {
    currentGame.UsersBits = [];
    currentGame.cardBitCoin = [
      { selectFrame: 1, bit: 0, card: "", winner: false },
      { selectFrame: 2, bit: 0, card: "", winner: false },
      { selectFrame: 3, bit: 0, card: "", winner: false },
    ];
  }
  if (time == -11) {
    time = 21;
    bet.splice(0, bet.length);
    await refreshSettings();

    currentGame.UsersBits = [];
    currentGame.cardBitCoin = [
      { selectFrame: 1, bit: 0, card: "", winner: false },
      { selectFrame: 2, bit: 0, card: "", winner: false },
      { selectFrame: 3, bit: 0, card: "", winner: false },
    ];
  }
  getTop5Users();
  io.emit("game", currentGame);
};

const getTop5Users = () => {
  let topUsers = [];
  activeUsers.sort((obj1, obj2) => (obj2.User?.diamond || 0) - (obj1.User?.diamond || 0));
  topUsers = activeUsers.slice(0, 5);
  io.emit("topUsers", topUsers);
};

const addBet = (diamond, id) => {
  if (bet.length) {
    const index = bet.findIndex((element) => element.userId == id);
    if (index != -1) {
      bet[index].amount += diamond;
    } else {
      bet.push({ amount: diamond, userId: id });
    }
  } else {
    bet.push({ amount: diamond, userId: id });
  }
};

server.listen(
  LISTER_PORT,
  () => console.log(`[Teen Patti] Server running on port: ${LISTER_PORT} (MySQL mode)`)
);

// Have Node serve the files for our built React app
app.use(express.static(path.resolve(__dirname, "./public")));

// All other GET requests not handled before will return our React app
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "./public", "index.html"));
});
