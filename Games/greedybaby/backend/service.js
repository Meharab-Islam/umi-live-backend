const FerryWheelGameHistory = require("./model/ferryWheelGameHistory.model");
const Wallet = require("./model/wallet.model");
const User = require("./model/user.model");
const GameAdminCoin = require("./model/gameAdminCoin.model");
const FerryWheelLastHistory = require("./model/ferryWheelLastHistory.model");
const FerryWheelRoundCounter = require("./model/ferryroundCounter.model");
const helper = require("./helper");
const config = require("./config");
const gameUserBridge = require("../../gameUserBridge.js");

const io = require("socket.io-client");
const mainBackendSocket = io(config.adminBaseURL); // Use your adminBaseURL here
mainBackendSocket.on("connect", () => {
  console.log("Connected to main backend from game backend");
});

exports.generateShuffledArray = () => {
  const highCount = 100 - 30;

  let result = [];
  for (let i = 0; i < lowCount; i++) {
    result.push("low");
  }
  for (let i = 0; i < highCount; i++) {
    result.push("high");
  }
  const iterations = 100;
  for (let k = 0; k < iterations; k++) {
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
  }
  return result;
};

exports.RandomResult = async () => {
  if (currentGame.UsersBits?.length !== 0) {
    const gameAdminCoin = await GameAdminCoin.findOne({});
    console.log("Current gameAdminCoin:", gameAdminCoin?.coin);
    console.log("Users Bits:", currentGame);

    // Calculate total bets amount
    const allBetsAmount = currentGame.UsersBits.reduce((sum, userBit) => sum + userBit.Bit, 0);

    console.log("global.setting ", global.setting);

    const ferrywheelSettings = global.setting && Object.keys(global.setting).length !== 0 ? global.setting.game.find((game) => game.name === "ferrywheel") : null;

    const minWinPercent = ferrywheelSettings ? ferrywheelSettings.minWinPercent / 100 : 0.25;
    const maxWinPercent = ferrywheelSettings ? ferrywheelSettings.maxWinPercent / 100 : 1;

    console.log(`Min Win Percent: ${minWinPercent}, Max Win Percent: ${maxWinPercent}`);

    // Define min and max payout range
    const minPayout = minWinPercent * allBetsAmount;
    const maxPayout = maxWinPercent * allBetsAmount;
    console.log(`Payout Range: Min=${minPayout}, Max=${maxPayout}`);

    // Function to calculate potential payout for each frame
    function calculatePayoutForFrame(frameInfo) {
      return currentGame.UsersBits.reduce((total, userBit) => {
        const selectedFrame = currentGame.frameBitCoin.find((frame) => frame.selectFrame === userBit.SelectedFrame);
        if (selectedFrame && selectedFrame.selectFrame === frameInfo.frame) {
          const frameMultiplier = helper.frameWinnerTimes[`frame${frameInfo.frame}`];
          return total + userBit.Bit * frameMultiplier;
        }
        return total;
      }, 0);
    }

    // Calculate payouts for all frames
    const potentialFrames = Array.from({ length: 8 }, (_, i) => i + 1).map((frame) => {
      const totalPayout = calculatePayoutForFrame({ frame });
      console.log(`Frame ${frame}: Potential Payout ${totalPayout}`);
      return { frame, totalPayout };
    });

    // Filter frames within the min-max range
    const eligibleFrames = potentialFrames.filter((frame) => frame.totalPayout >= minPayout && frame.totalPayout <= maxPayout);

    console.log("Eligible Frames:", eligibleFrames);

    // If no frames are eligible, fallback to lowest payout frame
    let selectedFrame;
    if (eligibleFrames.length > 0) {
      selectedFrame = eligibleFrames[Math.floor(Math.random() * eligibleFrames.length)];
    } else {
      // Fallback to the frame with the minimum payout
      selectedFrame = potentialFrames.reduce((minFrame, frame) => (frame.totalPayout < minFrame.totalPayout ? frame : minFrame));
    }

    console.log("Selected Frame:", selectedFrame);

    // Find the winning frame
    const winningFrame = currentGame.frameBitCoin.find((frame) => frame.selectFrame === selectedFrame.frame);

    const winCoinPercentValue = calculatePayoutForFrame({ frame: winningFrame.selectFrame });
    console.log(`Winning Frame Payout (${winningFrame.selectFrame}):`, winCoinPercentValue);

    // Return the result
    const result = {
      number: winningFrame.selectFrame,
      winCoinPercent: winCoinPercentValue,
      winnerNumberTimes: helper.frameWinnerTimes[`frame${winningFrame.selectFrame}`],
    };

    console.log("Final Result:", result);
    return result;
  }

  // Default fallback when no bets are present
  const validFrames = Array.from({ length: 8 }, (_, i) => i + 1);
  const randomDefaultWinner = validFrames[Math.floor(Math.random() * validFrames.length)];
  console.log("No user bets found, selecting random frame:", randomDefaultWinner);

  const result = {
    number: randomDefaultWinner,
    winCoinPercent: 0,
    winnerNumberTimes: helper.frameWinnerTimes[`frame${randomDefaultWinner}`],
  };

  console.log("Default Result:", result);
  return result;
};

exports.selectFrame = async (number) => {
  let winCoinPercent = 0;
  let winnerNumberTimes = 1;
  switch (number) {
    case 1:
      currentGame.frameBitCoin[0].winner = true;
      winCoinPercent += currentGame.frameBitCoin[0].bit * helper.frameWinnerTimes?.frame1;
      winnerNumberTimes = helper.frameWinnerTimes?.frame1;
      break;
    case 2:
      currentGame.frameBitCoin[1].winner = true;
      winCoinPercent += currentGame.frameBitCoin[1].bit * helper.frameWinnerTimes?.frame2;
      winnerNumberTimes = helper.frameWinnerTimes?.frame2;
      break;
    case 3:
      currentGame.frameBitCoin[2].winner = true;
      winCoinPercent += currentGame.frameBitCoin[2].bit * helper.frameWinnerTimes?.frame3;
      winnerNumberTimes = helper.frameWinnerTimes?.frame3;
      break;
    case 4:
      currentGame.frameBitCoin[3].winner = true;
      winCoinPercent += currentGame.frameBitCoin[3].bit * helper.frameWinnerTimes?.frame4;
      winnerNumberTimes = helper.frameWinnerTimes?.frame4;
      break;
    case 5:
      currentGame.frameBitCoin[4].winner = true;
      winCoinPercent += currentGame.frameBitCoin[4].bit * helper.frameWinnerTimes?.frame5;
      winnerNumberTimes = helper.frameWinnerTimes?.frame5;
      break;
    case 6:
      currentGame.frameBitCoin[5].winner = true;
      winCoinPercent += currentGame.frameBitCoin[5].bit * helper.frameWinnerTimes?.frame6;
      winnerNumberTimes = helper.frameWinnerTimes?.frame6;
      break;
    case 7:
      currentGame.frameBitCoin[6].winner = true;
      winCoinPercent += currentGame.frameBitCoin[6].bit * helper.frameWinnerTimes?.frame7;
      winnerNumberTimes = helper.frameWinnerTimes?.frame7;
      break;
    case 8:
      currentGame.frameBitCoin[7].winner = true;
      winCoinPercent += currentGame.frameBitCoin[7].bit * helper.frameWinnerTimes?.frame8;
      winnerNumberTimes = helper.frameWinnerTimes?.frame8;
      break;
    default:
      break;
  }

  console.log("selectFrame 111....................................", number, winCoinPercent);

  return { number, winCoinPercent, winnerNumberTimes };
};
{
  exports.gameAdminCoinUpdate = async (bitCoin) => {
    console.log("gameAdminCoinUpdate function call ==============", bitCoin);
    if (!isNaN(bitCoin)) {
      console.log("Finally updategameAdminCoinUpdate function call ==============", bitCoin);
      let gameAdminCoin = await GameAdminCoin.findOne();
      if (!gameAdminCoin) {
        gameAdminCoin = new GameAdminCoin();
      }
      gameAdminCoin.coin += bitCoin;
      await gameAdminCoin.save();
      return gameAdminCoin.coin;
    }
  };

  exports.updateUser = async (obj) => {
    try {
      console.log("obj.User._id  : ", obj.User._id);

      const updateUserResult = await User.findByIdAndUpdate(
        { _id: obj.User._id },
        {
          $inc: { diamond: -parseInt(obj.Bit) },
        },
        { new: true }
      );
      // console.log('updateUserResultupdateUserResult : ', updateUserResult);
      return updateUserResult;
    } catch (err) {
      console.log(err);
    }
  };

  exports.addBet = (diamond, id) => {
    console.log(betG, "bet");
    if (betG.length) {
      const index = betG.findIndex((element) => {
        if (element.userId == id) return true;
        return false;
      });
      if (index != -1) {
        betG[index].amount += diamond;
      } else {
        betG.push({
          amount: diamond,
          userId: id,
        });
      }
    } else {
      betG.push({
        amount: diamond,
        userId: id,
      });
    }
  };

  exports.addUserBits = (diamond, frame, id) => {
    if (currentGame.UsersBits.length) {
      const index = currentGame.UsersBits.findIndex((element) => {
        if (element.userId == id && element.SelectedFrame == frame) return true;
        return false;
      });
      if (index != -1) {
        currentGame.UsersBits[index].Bit += diamond;
      } else {
        currentGame.UsersBits.push({
          Bit: diamond,
          SelectedFrame: frame,
          userId: id,
          createdAt: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', }),
        });
      }
    } else {
      currentGame.UsersBits.push({
        Bit: diamond,
        SelectedFrame: frame,
        userId: id,
        createdAt: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', }),
      });
    }
  };

  exports.addGameHistory = async (number, sum, winCoinPercent, winnerNumberTimes) => {
    if (currentGame.UsersBits.length != 0) {
      console.log("data.winCoinPercent", winCoinPercent);

      updatedGameAdminCoin = await this.gameAdminCoinUpdate(-winCoinPercent);
      console.log("updatedGameAdminCoin", updatedGameAdminCoin);
      await new FerryWheelGameHistory({
        frameCoin: currentGame.frameBitCoin,
        totalAdd: sum, // total add coin in game
        winnerCoinMinus: -parseInt(winCoinPercent),
        updatedAdminCoin: parseInt(updatedGameAdminCoin),
        winnerNumber: number,
        winnerNumberTimes: winnerNumberTimes,
        userBits: currentGame.UsersBits,
        date: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        }),
      }).save();
    }
  };

  exports.createAdminCoin = async () => {
    let rouletteAdminCoin = await GameAdminCoin.findOne();
    if (!rouletteAdminCoin) {
      rouletteAdminCoin = await new GameAdminCoin().save();
    }
  };
}
exports.createHistoryWinnerNumber = async () => {
  let ferryWheelLastHistory = await FerryWheelLastHistory.findOne();
  if (!ferryWheelLastHistory) {
    ferryWheelLastHistory = await new FerryWheelLastHistory().save();
  }
};

exports.allUserHistory = async (currentGame, result) => {
  console.log("allUserHistory==================================", result);

  let sumByUserAndFrame = {};
  currentGame.UsersBits.forEach((bitData) => {
    const key = bitData.userId;
    if (!sumByUserAndFrame[key]) {
      sumByUserAndFrame[key] = {
        userId: key,
        BitData: [{ Bit: bitData.Bit, SelectedFrame: bitData.SelectedFrame }],
      };
    } else {
      const existingFrameIndex = sumByUserAndFrame[key].BitData.findIndex((item) => item.SelectedFrame === bitData.SelectedFrame);
      if (existingFrameIndex === -1) {
        sumByUserAndFrame[key].BitData.push({
          Bit: bitData.Bit,
          SelectedFrame: bitData.SelectedFrame,
        });
      } else {
        sumByUserAndFrame[key].BitData[existingFrameIndex].Bit += bitData.Bit;
      }
    }
  });

  const resultArray = Object.values(sumByUserAndFrame);
  console.log("resultArray :", resultArray);

  //  resultArray : [ { userId: '12200', BitData: [ { Bit: 100, SelectedFrame: 2 } , { Bit: 500, SelectedFrame: 1 }] },
  //   { userId: '122', BitData: [ { Bit: 100, SelectedFrame: 2 }] }]
  for (let index1 = 0; index1 < resultArray.length; index1++) {
    console.log("loop =========== :", index1);
    const element = resultArray[index1]; // { userId: '12200', BitData: [ { Bit: 100, SelectedFrame: 2 } , { Bit: 500, SelectedFrame: 1 }] }
    let winCoinPercent = 0;
    let findBetIndex;
    const resultFrameIndex = resultArray[index1].BitData.findIndex((item) => {
      if (item?.SelectedFrame == result) return true;
      return false;
    });
    let resultBitData;
    if (resultFrameIndex !== -1) {
      resultBitData = resultArray[index1].BitData[resultFrameIndex];
      // const resultBitData = { Bit: 100, SelectedFrame: 2 }
      switch (
      result // 1 to 8
      ) {
        case 1:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame1;
          break;
        case 2:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame2;
          break;
        case 3:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame3;
          break;
        case 4:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame4;
          break;
        case 5:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame5;
          break;
        case 6:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame6;
          break;
        case 7:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame7;
          break;
        case 8:
          winCoinPercent += resultBitData.Bit * helper.frameWinnerTimes?.frame8;
          break;
        default:
          break;
      }

      if (winCoinPercent > 0) {
        let winningUser = null;
        if (!isNaN(parseInt(element?.userId)) && parseInt(element?.userId) > 0) {
          await gameUserBridge.addCoins(element?.userId, winCoinPercent, 'greedybaby', 'Win on Greedy Baby');
          winningUser = await gameUserBridge.getUser(element?.userId);
        } else if (element?.userId && mongoose.isValidObjectId(element?.userId)) {
          const user = await User.findById(element?.userId).select({
            name: "$name",
            image: "$image",
            avatarFrameImage: "$avatarFrameImage",
          });
          winningUser = await User.findOneAndUpdate(
            { _id: user?._id },
            {
              $inc: { diamond: winCoinPercent },
            },
            { new: true }
          );
          if (user) winnerUserArrayG.push({ ...user._doc, userWinCoin: winCoinPercent });
        }

        console.log("global.setting?.coinForGameAnnouncement -----", global.setting?.coinForGameAnnouncement);

        if (winCoinPercent >= global.setting?.coinForGameAnnouncement) {
          mainBackendSocket.emit("highBit", {
            coin: winCoinPercent,
            user: user1,
            game: "Greedy Baby 🎡",
          });
        }
      }
    }
    findBetIndex = betG.findIndex((data) => {
      if (data?.userId == element?.userId) return true;
      return false;
    });
    const income = winCoinPercent - parseInt(betG[findBetIndex]?.amount);
    let history;
    if (!isNaN(income)) {
      if (income <= 0) {
        history = {
          userId: element?.userId,
          isIncome: false,
          type: 16,
          diamond: Math.abs(income),
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
          // ferryWheelGame: {
          //   winNumber: result, // resultObj: { no: 22, color: 'black', oddAndEven: 'even' },
          //   winCoin: winCoinPercent,
          //   totalAddAmount: parseInt(betG[findBetIndex]?.amount),
          // },
        };
        await new Wallet(history).save();
      } else {
        history = {
          userId: element?.userId,
          isIncome: true,
          type: 16,
          diamond: Math.floor(income),
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
          // ferryWheelGame: {
          //   winNumber: result, // resultObj: { no: 22, color: 'black', oddAndEven: 'even' },
          //   winCoin: winCoinPercent,
          //   totalAddAmount: parseInt(betG[findBetIndex]?.amount),
          // },
        };
        await new Wallet(history).save();
      }
    }
    console.log("MAIN HISTORY ++++++++++++++++++++++++++++++++++++++ income", income, "+++++++++++++");
    betG.splice(findBetIndex, 1);
  }
};

exports.historyRecord = async (_id) => {
  let ferryWheelLastHistoryAggregation = await FerryWheelGameHistory.aggregate([
    {
      $match: {
        "userBits.userId": _id,
      },
    },
    {
      $unwind: "$userBits",
    },
    {
      $match: {
        "userBits.userId": _id,
      },
    },
    { $sort: { "userBits.createdAt": -1 } },
    { $limit: 100 },
    {
      $project: {
        selectedFrame: "$userBits.SelectedFrame",
        Bit: "$userBits.Bit",
        createdAt: "$userBits.createdAt",
        winnerNumber: "$winnerNumber",
        winnerNumberTimes: "$winnerNumberTimes",
        isWinner: {
          $eq: ["$userBits.SelectedFrame", "$winnerNumber"],
        },
      },
    },
  ]);

  return ferryWheelLastHistoryAggregation;
};

exports.todayProfit = async (_id) => {
  let today = new Date();
  today.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0 for the current day

  let tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1); // Set to the next day
  console.log("today : ", today);
  console.log("tomorrow : ", tomorrow);

  let ferryWheelLastHistoryAggregation = await FerryWheelGameHistory.aggregate([
    {
      $match: {
        createdAt: {
          $gte: today,
          $lt: tomorrow,
        },
      },
    },
    {
      $match: {
        "userBits.userId": _id,
      },
    },
    {
      $unwind: "$userBits",
    },
    {
      $match: {
        "userBits.userId": _id,
        $expr: { $eq: ["$userBits.SelectedFrame", "$winnerNumber"] },
      },
    },
    {
      $group: {
        _id: "$_id",
        winnerNumber: { $first: "$winnerNumber" },
        sumOfBits: { $sum: "$userBits.Bit" },
        winnerNumberTimes: { $first: "$winnerNumberTimes" },
      },
    },
    {
      $group: {
        _id: null,
        totalResult: {
          $sum: { $multiply: ["$sumOfBits", "$winnerNumberTimes"] },
        },
      },
    },
  ]);
  return ferryWheelLastHistoryAggregation[0]?.totalResult;
};
