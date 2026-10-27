const { numberArray, rouletteWheelNumbers } = require("./array");
const RouletteGameHistory = require("./model/roulettegameHistory.model");
const Wallet = require("./model/wallet.model");
const User = require("./model/user.model");
const GameAdminCoin = require("./model/gameAdminCoin");
const HistoryWinnerNumber = require("./model/rouletteLastHistory.model");

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

let gameCounter = 0; // Global variable to track the number of games played
let nextForcedWinGame = Math.floor(Math.random() * 50) + 100; // Randomly choose a game between 100 and 150 for 36 to win

exports.RandomResult = async () => {
  gameCounter++; // Increment the game counter
  console.log(`Game Counter: ${gameCounter}, Next Forced Win Game: ${nextForcedWinGame}`);

  const casinoSettings = global.setting && Object.keys(global.setting).length !== 0 ? global.setting.game.find((game) => game.name === "casino") : null;

  const minWinPercent = casinoSettings ? casinoSettings.minWinPercent / 100 : 0.25;
  const maxWinPercent = casinoSettings ? casinoSettings.maxWinPercent / 100 : 1;

  console.log(`Fetched minWinPercent: ${minWinPercent * 100}%`);
  console.log(`Fetched maxWinPercent: ${maxWinPercent * 100}%`);

  if (currentGame.UsersBits?.length !== 0) {
    const gameAdminCoin = await GameAdminCoin.findOne({});
    console.log("Current gameAdminCoin:", gameAdminCoin?.coin);

    // Calculate total bets amount
    const totalBetAmount = currentGame.UsersBits.reduce((sum, userBit) => sum + userBit.Bit, 0);
    console.log("Total Bets Amount:", totalBetAmount);

    // Define min and max payout range dynamically
    const minPayout = minWinPercent * totalBetAmount;
    const maxPayout = maxWinPercent * totalBetAmount;
    console.log(`Payout Range: Min=${minPayout}, Max=${maxPayout}`);

    // Function to calculate the potential payout if a given number wins
    function calculatePayoutForNumber(numberInfo) {
      let totalPayout = 0;

      currentGame.UsersBits.forEach((userBit) => {
        let payout = 0;
        const selectedFrame = currentGame.cardBitCoin.find((frame) => frame.selectFrame === userBit.SelectedFrame);

        if (selectedFrame) {
          // Check and calculate payout based on the correct frame sequence
          if(selectedFrame.selectFrame === 1 && numberInfo.no == 0){
            payout += userBit.Bit * 36; // 36x payout for 0
          } else
          if (selectedFrame.selectFrame === 2 && numberInfo.no >= 1 && numberInfo.no <= 12) {
            payout += userBit.Bit * 3; // 3x payout for 1-12 range
          } else if (selectedFrame.selectFrame === 3 && numberInfo.no >= 13 && numberInfo.no <= 24) {
            payout += userBit.Bit * 3; // 3x payout for 13-24 range
          } else if (selectedFrame.selectFrame === 4 && numberInfo.no >= 25 && numberInfo.no <= 36) {
            payout += userBit.Bit * 3; // 3x payout for 25-36 range
          }
        
          // Check and calculate payout for color bets (red, black)
          if (selectedFrame.selectFrame === 5 && numberInfo.color === "red") {
            payout += userBit.Bit * 2; // 2x payout for red
          } else if (selectedFrame.selectFrame === 6 && numberInfo.color === "black") {
            payout += userBit.Bit * 2; // 2x payout for black
          }

          // Check and calculate payout for odd/even bets
          if (selectedFrame.selectFrame === 7 && numberInfo.oddAndEven === "odd") {
            payout += userBit.Bit * 2; // 2x payout for odd
          } else if (selectedFrame.selectFrame === 8 && numberInfo.oddAndEven === "even") {
            payout += userBit.Bit * 2; // 2x payout for even
          }
        }

        // Sum the payout for this particular number
        totalPayout += payout;
      });

      return totalPayout;
    }

    // Calculate payouts for all possible numbers, excluding 0 and 1
    const potentialNumbers = rouletteWheelNumbers
      .filter((num) => num !== 0 && num !== 1)
      .map((number) => {
        const numberInfo = numberArray.find((num) => num.no === number);
        const totalPayout = calculatePayoutForNumber(numberInfo);
        console.log(`Potential Payout for Number ${number}: ${totalPayout}`);
        return { number, totalPayout };
      });

    console.log("potentialNumbers-->" , potentialNumbers);

    // Filter numbers within the min-max range
    const eligibleNumbers = potentialNumbers.filter((num) => num.totalPayout >= minPayout && num.totalPayout <= maxPayout);
    console.log("Eligible Numbers (Within Payout Range):", eligibleNumbers);

    // If it's time for the forced win of 36
    if (gameCounter === nextForcedWinGame) {
      console.log("Forcing win for number 36");
      nextForcedWinGame = gameCounter + Math.floor(Math.random() * 50) + 100; // Set the next forced win between 100 to 150 games
      return 36;
    }

    // Select the number with the lowest payout within the min-max range (best for house)
    let selectedNumber;
    if (eligibleNumbers.length > 0) {
      const randomNum = Math.floor(Math.random() * eligibleNumbers.length)
      selectedNumber = eligibleNumbers[randomNum].number;
    } else {
      // If no numbers are within the min-max range, select the one with the lowest payout
      selectedNumber = potentialNumbers.reduce((minNum, num) => (num.totalPayout < minNum.totalPayout ? num : minNum)).number;
    }

    console.log("House Edge Selected Winner Number:", selectedNumber);
    return selectedNumber;
  }

  // Default random selection if no user bets, excluding 0 and 1
  const validNumbers = rouletteWheelNumbers.filter((num) => num !== 0 && num !== 1);
  const randomDefaultWinner = validNumbers[Math.floor(Math.random() * validNumbers.length)];
  console.log("No user bets found, randomly selecting winner number:", randomDefaultWinner);
  return randomDefaultWinner;
};

exports.selectFrame = async (number) => {
  const resultObj = numberArray.find((item) => item.no === number);
  console.log("resultObj 222....................................", number);
  console.log("currentGame.", currentGame);
  global.winCoinPercent = 0;

  if (number === 0) {
    currentGame.cardBitCoin[0].winner = true;
    winCoinPercent += currentGame.cardBitCoin[0].bit * 36;
  } else if (number >= 1 && number <= 12) {
    currentGame.cardBitCoin[1].winner = true;
    winCoinPercent += currentGame.cardBitCoin[1].bit * 3;
  } else if (number >= 13 && number <= 24) {
    currentGame.cardBitCoin[2].winner = true;
    winCoinPercent += currentGame.cardBitCoin[2].bit * 3;
  } else if (number >= 25 && number <= 36) {
    currentGame.cardBitCoin[3].winner = true;
    winCoinPercent += currentGame.cardBitCoin[3].bit * 3;
  }

  if (resultObj.color === "red") {
    currentGame.cardBitCoin[4].winner = true;
    winCoinPercent += currentGame.cardBitCoin[4].bit * 2;
  } else if (resultObj.color === "black") {
    currentGame.cardBitCoin[5].winner = true;
    winCoinPercent += currentGame.cardBitCoin[5].bit * 2;
  }

  if (resultObj.oddAndEven === "odd") {
    currentGame.cardBitCoin[6].winner = true;
    winCoinPercent += currentGame.cardBitCoin[6].bit * 2;
  } else if (resultObj.oddAndEven === "even") {
    currentGame.cardBitCoin[7].winner = true;
    winCoinPercent += currentGame.cardBitCoin[7].bit * 2;
  }
  let sum = 0;
  for (const item of currentGame.cardBitCoin) {
    sum += item.bit;
  }
  return { resultObj, sum, winCoinPercent };
};
{
  exports.isLow = async (number) => {
    const resultObj = numberArray.find((item) => item.no === number);
    let lowFuncResult = 0;
    if (number === 0) {
      lowFuncResult += currentGame.cardBitCoin[0].bit * 36;
    } else if (number >= 1 && number <= 12) {
      lowFuncResult += currentGame.cardBitCoin[1].bit * 3;
    } else if (number >= 13 && number <= 24) {
      lowFuncResult += currentGame.cardBitCoin[2].bit * 3;
    } else if (number >= 25 && number <= 36) {
      lowFuncResult += currentGame.cardBitCoin[3].bit * 3;
    }
    if (resultObj.color === "red") {
      lowFuncResult += currentGame.cardBitCoin[4].bit * 2;
    } else if (resultObj.color === "black") {
      lowFuncResult += currentGame.cardBitCoin[5].bit * 2;
    }
    if (resultObj.oddAndEven === "odd") {
      lowFuncResult += currentGame.cardBitCoin[6].bit * 2;
    } else if (resultObj.oddAndEven === "even") {
      lowFuncResult += currentGame.cardBitCoin[7].bit * 2;
    }
    return lowFuncResult;
  };
  exports.gameAdminCoinUpdate = async (bitCoin) => {
    console.log("gameAdminCoinUpdate function call ==============", bitCoin);
    if (!isNaN(bitCoin)) {
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
      const updateUserResult = await User.findByIdAndUpdate(
        { _id: obj.User._id },
        {
          $inc: { diamond: -parseInt(obj.Bit) },
        },
        { new: true }
      );
      return updateUserResult;
    } catch (err) {
      console.log(err);
    }
  };
  exports.addBet = (diamond, id) => {
    if (bet.length) {
      const index = bet.findIndex((element) => {
        if (element.userId == id) return true;
        return false;
      });
      if (index != -1) {
        bet[index].amount += diamond;
      } else {
        bet.push({
          amount: diamond,
          userId: id,
        });
      }
    } else {
      bet.push({
        amount: diamond,
        userId: id,
      });
    }
  };

  exports.addGameHistory = async (data) => {
    if (currentGame.UsersBits.length != 0) {
      updatedGameAdminCoin = await this.gameAdminCoinUpdate(-data.winCoinPercent);
      await new RouletteGameHistory({
        cardCoin: currentGame.cardBitCoin,
        totalAdd: data.sum, // total add coin in game
        winnerCoinMinus: -parseInt(data.winCoinPercent),
        updatedAdminCoin: parseInt(updatedGameAdminCoin),
        winnerObj: data.resultObj,
        date: new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        }),
      }).save();
    }
  };

  exports.coin = async () => {
    let rouletteAdminCoin = await GameAdminCoin.findOne();
    if (!rouletteAdminCoin) {
      rouletteAdminCoin = await new GameAdminCoin({
        coin: 0,
        totalCoin: 0,
      }).save();
    }
  };
}
exports.createrouletteLastHistory = async () => {
  let historyWinnerNumber = await HistoryWinnerNumber.findOne();
  if (!historyWinnerNumber) {
    historyWinnerNumber = await new HistoryWinnerNumber({
      winnerNumber: [],
    }).save();
  }
};

exports.allUserHistory = async (currentGame, resultObj) => {
  console.log("allUserHistory==================================", resultObj);
  const array = currentGame?.cardBitCoin.filter((item) => item.winner).map((item) => item.selectFrame);

  let sumByUserAndFrame = {};
  currentGame.UsersBits.forEach((bitData) => {
    const key = bitData.UserId;
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
  //  resultArray : [ { userId: '12200', BitData: [ { Bit: 100, SelectedFrame: 2 } , { Bit: 500, SelectedFrame: 1 }] },
  //   { userId: '122', BitData: [ { Bit: 100, SelectedFrame: 2 }] }]
  for (let index1 = 0; index1 < resultArray.length; index1++) {
    const element = resultArray[index1]; // { userId: '12200', BitData: [ { Bit: 100, SelectedFrame: 2 } , { Bit: 500, SelectedFrame: 1 }] }
    let winCoinPercent = 0;
    for (let index = 0; index < element.BitData.length; index++) {
      const element2 = element.BitData[index]; //  { Bit: 100, SelectedFrame: 2 }
      if (array.includes(element2.SelectedFrame)) {
        switch (element2.SelectedFrame) {
          case 1:
            winCoinPercent += element2.Bit * 36;
            break;
          case 2:
          case 3:
          case 4:
            winCoinPercent += element2.Bit * 3;
            break;
          case 5:
          case 6:
          case 7:
          case 8:
            winCoinPercent += element2.Bit * 2;
            break;
        }
      }
    }
    const findBetIndex = bet.findIndex((data) => {
      if (data?.userId == element?.userId) return true;
      return false;
    });
    const income = winCoinPercent - parseInt(bet[findBetIndex]?.amount);
    if (!isNaN(income)) {
      if (income <= 0) {
        history = {
          userId: bet[findBetIndex]?.userId,
          isIncome: false,
          type: 15,
          diamond: Math.abs(income),
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
          rouletteGame: {
            winNumber: resultObj.resultObj.no,
            resultObj: resultObj.resultObj, // resultObj: { no: 22, color: 'black', oddAndEven: 'even' },
            winCoin: winCoinPercent,
            totalAddAmount: parseInt(bet[findBetIndex]?.amount),
          },
        };
      } else {
        history = {
          userId: bet[findBetIndex]?.userId,
          isIncome: true,
          type: 15,
          diamond: Math.floor(income),
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
          rouletteGame: {
            winNumber: resultObj.resultObj.no,
            winCoin: winCoinPercent,
            resultObj: resultObj.resultObj,
            totalAddAmount: parseInt(bet[findBetIndex]?.amount),
          },
        };
      }
    }

    await new Wallet(history).save();

    const uid = bet[findBetIndex]?.userId;
    let winningUser = null;
    if (!isNaN(parseInt(uid)) && parseInt(uid) > 0) {
      await gameUserBridge.addCoins(uid, winCoinPercent, 'roulettecasino', 'Win on Roulette Casino');
      winningUser = await gameUserBridge.getUser(uid);
    } else if (uid && mongoose.isValidObjectId(uid)) {
      const user = await User.findById(uid);
      if (user) {
        winningUser = await User.findOneAndUpdate({ _id: user._id }, { $inc: { diamond: winCoinPercent } }, { new: true });
      }
    }

    highCoinValue = global.setting?.coinForGameAnnouncement || 1000;
    if (winCoinPercent >= highCoinValue && winningUser) {
      console.log("highCoinValue--------------", highCoinValue);

      mainBackendSocket.emit("highBit", {
        coin: winCoinPercent,
        user: winningUser,
        game: "Roullete Casino 🎡",
      });
    }

    console.log("MAIN HISTORY ++++++++++++++++++++++++++++++++++++++ income", income, "+++++++++++++", history.rouletteGame);

    bet.splice(findBetIndex, 1);
  }
};

// get roulette game history for user
exports.historyRecord = async (_id) => {
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    let historyRecord = await Wallet.find(
      { type: 15, userId: user?._id },
      {
        diamond: 1,
        date: 1,
        createdAt: 1,
        isIncome: 1,
        rouletteGame: 1,
      }
    )
      .sort({ createdAt: -1 })
      .limit(30);
    return historyRecord;
  } catch (error) {
    console.log(error);
  }
};
