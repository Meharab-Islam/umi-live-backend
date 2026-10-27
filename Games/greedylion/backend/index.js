var createError = require("http-errors");
var express = require("express");
var path = require("path");
const mongoose = require("mongoose");
const FerryWheelLastHistory = require("./model/ferryWheelLastHistory.model");
const GameAdminCoin = require("./model/gameAdminCoin.model");
const config = require("./config");
var app = express();
const port = config.PORT || 5001;
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const User = require("./model/user.model");

const {
  selectFrame,
  RandomResult,
  allUserHistory,
  createHistoryWinnerNumber,
  addBet,
  addUserBits,
  updateUser,
  createAdminCoin,
  historyRecord,
  todayProfit,
  addGameHistory,
} = require("./service");
const { getDefaultSettings } = require("http2");

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
        { name: "greedylion", minWinPercent: 25, maxWinPercent: 100 },
        { name: "ferrywheel", minWinPercent: 25, maxWinPercent: 100 },
      ],
      coinForGameAnnouncement: 1000,
      gameCoin: [100, 200, 300, 400, 500],
    },
  });
});

app.get("/*", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "public", "index.html"));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

const server = http.createServer(app);

//Setup for server and socket.io

global.io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const url = config.mongoDbConnectionString;
const db = mongoose.connection;

process.on("unhandledRejection", (err) => {
  console.log(err?.name, err?.message);
});

db.once("open", () => {
  console.log(`Mongo Connected successfully on port:${port}`);
});

const refreshSettings = async () => {
  try {
    if (!mongoose.connection.db) return;
    const settings = await mongoose.connection.db
      .collection("settings")
      .findOne({});

    if (settings) {
      global.setting = settings;
    } else {
      global.setting = {
        game: [
          { name: "greedylion", minWinPercent: 25, maxWinPercent: 100 },
          { name: "ferrywheel", minWinPercent: 25, maxWinPercent: 100 },
        ],
        coinForGameAnnouncement: 1000,
        gameCoin: [100, 200, 300, 400, 500],
      };
    }
  } catch (error) {
    console.error("Error refreshing settings:", error);
  }
};

mongoose
  .connect(url)
  .then(async () => {
    console.log("MongoDB connected successfully");

    // Seed default demo user if not present
    const DEMO_USER_ID = "6579c2980cb6184131234567";
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

    // Seed default settings if not present
    const existingSettings = await mongoose.connection.db
      .collection("settings")
      .findOne({});
    if (!existingSettings) {
      await mongoose.connection.db.collection("settings").insertOne({
        game: [
          { name: "greedylion", minWinPercent: 25, maxWinPercent: 100 },
          { name: "ferrywheel", minWinPercent: 25, maxWinPercent: 100 },
        ],
        coinForGameAnnouncement: 1000,
        gameCoin: [100, 200, 300, 400, 500],
      });
      console.log("Default settings created in database");
    }

    await refreshSettings();
    await createAdminCoin();
    await createHistoryWinnerNumber();

    try {
      const isReplicaSet = await mongoose.connection.db
        .admin()
        .command({ isMaster: 1 });
      if (isReplicaSet && isReplicaSet.setName) {
        const changeStream = mongoose.connection.db
          .collection("settings")
          .watch();
        changeStream.on("change", async () => {
          console.log("Settings updated in DB, refreshing global settings...");
          await refreshSettings();
        });
      }
    } catch (e) {
      // Replica set changeStream optional in standalone local MongoDB
    }
  })
  .catch((err) => console.error("Database connection error:", err));

//Game Loop For Timer
setInterval(() => {
  updateTime();
}, 1000);

global.betG = [];
global.winnerUserArrayG = [];
global.highOrLowWinResult = [];
let time = 25;
let randomWinnerNumber, RandomResWithSelectedFrame;
global.currentGame = {
  UsersBits: [],
  frameBitCoin: [
    { selectFrame: 1, bit: 0, winner: false },
    { selectFrame: 2, bit: 0, winner: false },
    { selectFrame: 3, bit: 0, winner: false },
    { selectFrame: 4, bit: 0, winner: false },
    { selectFrame: 5, bit: 0, winner: false },
    { selectFrame: 6, bit: 0, winner: false },
    { selectFrame: 7, bit: 0, winner: false },
    { selectFrame: 8, bit: 0, winner: false },
  ],
};

io.on("connection", async (socket) => {
  const { globalRoom } = socket?.handshake?.query;

  console.log("globalRoom connect =====", globalRoom);
  let todayProfitCoin = 0;
  const user = await User.findById(globalRoom);
  todayProfitCoin = await todayProfit(globalRoom);
  //Start game
  socket.on("startGame", async (obj) => {
    if (user) {
      console.log(
        "------------------------------user in game start-------------------------------",
        user?.diamond
      );
      socket.emit("start", user);
      console.log("--user--", user.name);
      io.emit("game", currentGame);
      const ferryWheelLastHistory = await FerryWheelLastHistory.findOne();
      socket.emit("lastHistories", ferryWheelLastHistory?.winnerNumber); // last 5 number history
      socket.emit("gameRound", ferryWheelLastHistory?.totalRound); // last some histories
      socket.emit(
        "todayProfit",
        parseInt(todayProfitCoin) ? parseInt(todayProfitCoin) : 0
      );

      todayProfit;
      if (time < 2) {
        io.emit("randomWinnerNumber", randomWinnerNumber); // 3 or 6
      }
    } else {
      socket.emit("start", null);
    }
  });
  socket.on("bit", async (obj) => {
    const userDb = await updateUser(obj);
    console.log("BIT ==============  obj.SelectedFrame", obj.SelectedFrame);
    if (userDb?.diamond < 0) {
      userDb.diamond = 0;
      await userDb.save(); // @toDo
      io.emit("start", userDb);
    }
    var objToModify = currentGame.frameBitCoin.find(
      (val) => val.selectFrame === obj.SelectedFrame
    );

    if (objToModify) {
      objToModify.bit += obj.Bit;
    }
    addUserBits(obj.Bit, obj.SelectedFrame, obj.User._id);
    addBet(obj.Bit, obj.User._id);
    await GameAdminCoin.updateOne(
      {},
      { $inc: { coin: obj.Bit } },
      { new: true }
    );
    // io.emit('bit', bitData);
  });
  socket.on("user", async () => {
    console.log("user listen ============== ", time, winnerUserArrayG);
    const user = await User.findById(globalRoom);
    socket.emit("user", user);
    todayProfitCoin = await todayProfit(globalRoom);
    socket.emit(
      "todayProfit",
      parseInt(todayProfitCoin) ? parseInt(todayProfitCoin) : 0
    );
  });
  socket.on("historyRecord", async (data) => {
    console.log("historyRecord 111===========", data._id);

    const record = await historyRecord(data._id);
    console.log("record 111===========", record);

    socket.emit("historyRecord", record);
  });
  socket.on("disconnect", () => {
    console.log(
      "disconnect one socket >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>"
    );
  });
});

const updateTime = async () => {
  io.emit("time", time);
  time--;

  if (time == -7) {
    RandomResWithSelectedFrame = await RandomResult();
    console.log(
      " RandomResWithSelectedFrame  : ======== ",
      RandomResWithSelectedFrame
    );

    randomWinnerNumber = RandomResWithSelectedFrame?.number;
    console.log(" randomWinnerNumber  : ======== ", RandomResWithSelectedFrame);
  }

  if (time == -9) {
    // make a random winner
    console.log(" time  : ======== ", time);
    let sum = 0;
    for (const item of currentGame.frameBitCoin) {
      sum += item.bit;
    }
    await addGameHistory(
      RandomResWithSelectedFrame.number,
      sum,
      RandomResWithSelectedFrame.winCoinPercent,
      RandomResWithSelectedFrame.winnerNumberTimes
    );
    io.emit("randomWinnerNumber", randomWinnerNumber); // 3 or 6
  }
  // -12 result declare in frontend Side
  //-14 new game start in frontend Side
  if (time == -11) {
    allUserHistory(currentGame, randomWinnerNumber);
  }
  if (time == 2) {
    io.emit("game", currentGame);
  }
  if (time == -13) {
    const sortedArray = winnerUserArrayG.sort(
      (a, b) => b.userWinCoin - a.userWinCoin
    );
    const resultTopUserArray = sortedArray.map((element, index) => ({
      ...element,
      number: index + 1,
    }));
    io.emit("winnerUserArray", {
      winnerUserArray: resultTopUserArray,
      winnerNumber: randomWinnerNumber,
    });
  }
  if (time == -14) {
    let ferryWheelLastHistory = await FerryWheelLastHistory.findOne();
    if (ferryWheelLastHistory) {
      ferryWheelLastHistory.winnerNumber.unshift(randomWinnerNumber);
      if (ferryWheelLastHistory.winnerNumber.length > 15) {
        ferryWheelLastHistory.winnerNumber.pop();
      }
      ferryWheelLastHistory.totalRound += 1;
      await ferryWheelLastHistory.save();
      io.emit("lastHistories", ferryWheelLastHistory.winnerNumber); // last some histories
    }
  }

  if (time == -15) {
    currentGame.UsersBits = [];
    bitData = [];
    winnerUserArrayG = [];
    currentGame.frameBitCoin = [
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
    time = 25;
    betG?.splice(0, betG?.length);
    let ferryWheelLastHistory = await FerryWheelLastHistory.findOne();
    if (ferryWheelLastHistory) {
      io.emit("gameRound", ferryWheelLastHistory.totalRound); // last some histories
    }
    await refreshSettings();
  }
};
server.listen(port, () => {
  console.log(`magic happen on ${port}`);
});
