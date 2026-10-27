var express = require("express");
var path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const config = require("./config");

var app = express();
const port = config.PORT;
const http = require("http");
const { Server } = require("socket.io");
const User = require("./model/user.model");
const GameAdminCoin = require("./model/gameAdminCoin");
const RouletteLastHistory = require("./model/rouletteLastHistory.model");

const { selectFrame, RandomResult, addGameHistory, allUserHistory, createrouletteLastHistory, addBet, updateUser, coin, historyRecord } = require("./service");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

// Settings API endpoint for frontend
app.get("/setting", (req, res) => {
  res.status(200).json({
    status: true,
    message: "Settings fetched successfully",
    setting: global.setting || {
      game: [
        { name: "casino", minWinPercent: 25, maxWinPercent: 100 },
        { name: "roulette", minWinPercent: 25, maxWinPercent: 100 },
      ],
      coinForGameAnnouncement: 1000,
      gameCoin: [100, 200, 300, 400, 500],
      roulette_gameRule:
        "Roulette Game Rules: Place your bets on numbers, colors, or combinations. When the timer ends, the wheel spins and winners are rewarded based on payouts!",
    },
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

const url = config.mongoDbConnectionString;

const refreshSettings = async () => {
  try {
    if (!mongoose.connection.db) return;
    const settings = await mongoose.connection.db.collection("settings").findOne({});
    if (settings) {
      global.setting = settings;
    } else {
      global.setting = {
        game: [
          { name: "casino", minWinPercent: 25, maxWinPercent: 100 },
          { name: "roulette", minWinPercent: 25, maxWinPercent: 100 },
        ],
        coinForGameAnnouncement: 1000,
        gameCoin: [100, 200, 300, 400, 500],
        roulette_gameRule:
          "Roulette Game Rules: Place your bets on numbers, colors, or combinations. When the timer ends, the wheel spins and winners are rewarded based on payouts!",
      };
    }
  } catch (error) {
    console.error("Error fetching the settings:", error);
  }
};

process.on("unhandledRejection", (err) => {
  console.log(err?.name, err?.message);
});

// Connect to MongoDB and seed initial collections/data
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("MongoDB connected successfully");

    // Seed default demo user if not present
    const DEMO_USER_ID = "6579c2980cb6184131234567";
    try {
      const existingUser = await User.findById(DEMO_USER_ID);
      if (!existingUser) {
        await User.create({
          _id: DEMO_USER_ID,
          name: "Demo Player",
          username: "demoplayer",
          diamond: 100000,
          rCoin: 50000,
          gender: "male",
          country: "Global",
        });
        console.log("Demo user created with ID:", DEMO_USER_ID);
      }
    } catch (e) {
      console.log("Demo user seed note:", e.message);
    }

    // Seed default settings if not present
    try {
      const existingSettings = await mongoose.connection.db
        .collection("settings")
        .findOne({});
      if (!existingSettings) {
        await mongoose.connection.db.collection("settings").insertOne({
          game: [
            { name: "casino", minWinPercent: 25, maxWinPercent: 100 },
            { name: "roulette", minWinPercent: 25, maxWinPercent: 100 },
          ],
          coinForGameAnnouncement: 1000,
          gameCoin: [100, 200, 300, 400, 500],
          roulette_gameRule:
            "Roulette Game Rules: Place your bets on numbers, colors, or combinations. When the timer ends, the wheel spins and winners are rewarded based on payouts!",
        });
        console.log("Default settings created in database");
      }
    } catch (e) {
      console.log("Settings seed note:", e.message);
    }

    await refreshSettings();
    await coin();
    await createrouletteLastHistory();

    try {
      const db = mongoose.connection.db;
      const isReplicaSet = await db.admin().command({ isMaster: 1 });

      if (isReplicaSet.setName) {
        const changeStream = db.collection("settings").watch();
        changeStream.on("change", async (change) => {
          console.log("Settings updated in DB, refreshing global settings...");
          await refreshSettings();
        });
      } else {
        console.log(
          "Change streams are not supported (MongoDB is not in a replica set)."
        );
      }
    } catch (e) {}
  })
  .catch((err) => console.error("Database connection error:", err));

//Game Loop For Timer
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
  Combinations: 9, // default combination
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
  console.log("connection...............................connection", socket.id);

  const { globalRoom } = socket?.handshake?.query;
  console.log("globalRoom", globalRoom);
  const targetUserId =
    globalRoom && globalRoom !== "null" && globalRoom !== "undefined"
      ? globalRoom
      : "6579c2980cb6184131234567";

  let user = null;
  try {
    user = await User.findById(targetUserId);
    if (!user && targetUserId === "6579c2980cb6184131234567") {
      user = await User.create({
        _id: "6579c2980cb6184131234567",
        name: "Demo Player",
        username: "demoplayer",
        diamond: 100000,
        rCoin: 50000,
        gender: "male",
        country: "Global",
      });
    }
  } catch (e) {
    console.log("Error querying user:", e.message);
  }

  socket.on("startGame", async (obj) => {
    if (user) {
      console.log("------------------------------user in game start-------------------------------", user?.diamond);
      socket.emit("start", user);
      console.log("--user--", user.name);
      io.emit("game", currentGame);
      const rouletteLastHistory = await RouletteLastHistory.findOne();
      socket.emit("gameNumberHistory", rouletteLastHistory?.winnerNumber || []);
    } else {
      socket.emit("start", null);
    }
  });
  socket.on("bit", async (obj) => {
    const userDb = await updateUser(obj);
    console.log("BIT ============== ");
    if (userDb.diamond < 0) {
      userDb.diamond = 0;
      await userDb.save();
      io.emit("start", userDb);
    }
    var objToModify = currentGame.cardBitCoin.find((val) => val.selectFrame === obj.SelectedFrame);

    if (objToModify) {
      objToModify.bit += obj.Bit;
    }
    // how much coin add in bit [user wise bit]
    let bitData = {
      UserId: obj.User._id,
      Bit: obj.Bit,
      SelectedFrame: obj.SelectedFrame,
      position: obj.position,
    };
    currentGame.UsersBits.push(bitData);
    addBet(obj.Bit, obj.User._id);
    await GameAdminCoin.updateOne({}, { $inc: { coin: obj.Bit } }, { new: true });
    io.emit("bit", bitData);
  });
  socket.on("historyRecord", async () => {
    console.log("historyRecord listen");
    let historyRecordResult = await historyRecord(globalRoom);
    console.log("historyRecord emit", historyRecordResult?.length);

    socket.emit("historyRecord", historyRecordResult);
  });

  // Get User
  socket.on("user", async (obj) => {
    // emit -6 sec
    if (obj.User?._id) {
      const userDb = await User.findById(obj.User._id); // if in DB UserDiamond and gameUserDiamond is mismatch the DB user emit
      if (userDb?.diamond !== obj.User?.diamond) {
        socket.emit("start", userDb);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("disconnect one socket >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
  });
});

const updateTime = async () => {
  io.emit("time", time);
  time--;
  if (time === -1) {
    // make a random winner
    randomWinnerNumber = await RandomResult();
    console.log("Random winner number selected: ", randomWinnerNumber);

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
    const rouletteLastHistory = await RouletteLastHistory.findOne();
    const addToCollection = async (obj) => {
      rouletteLastHistory.winnerNumber.unshift(obj);
      if (rouletteLastHistory.winnerNumber.length > 20) {
        rouletteLastHistory.winnerNumber.pop();
      }
      await rouletteLastHistory.save();
    };
    await addToCollection(resultObj.resultObj);
    io.emit("gameNumberHistory", rouletteLastHistory.winnerNumber);
  }
  if (time === -5) {
    console.log("allUserHistory function call");
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
    console.log("New game starting.");
  }
};

server.listen(port, () => {
  console.log(`magic happen on ${port}`);
});
