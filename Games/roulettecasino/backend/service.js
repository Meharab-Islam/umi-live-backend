const { numberArray, rouletteWheelNumbers } = require("./array");
const config = require("./config");
const gameUserBridge = require("../../gameUserBridge.js");
const io = require("socket.io-client");

const mainBackendSocket = io(config.adminBaseURL, { reconnectionAttempts: 3, timeout: 5000 });
mainBackendSocket.on("connect", () => {
  console.log("Connected to main backend from roulette backend");
});
mainBackendSocket.on("connect_error", (err) => {
  console.log("Main backend socket notice:", err.message);
});

let gameCounter = 0;
let nextForcedWinGame = Math.floor(Math.random() * 50) + 100;

exports.RandomResult = async () => {
  gameCounter++;
  const casinoSettings =
    global.setting && Object.keys(global.setting).length !== 0
      ? global.setting.game?.find((game) => game.name === "casino" || game.name === "roulette")
      : null;

  const minWinPercent = casinoSettings ? casinoSettings.minWinPercent / 100 : 0.25;
  const maxWinPercent = casinoSettings ? casinoSettings.maxWinPercent / 100 : 1;

  if (currentGame.UsersBits?.length !== 0) {
    const totalBetAmount = currentGame.UsersBits.reduce((sum, userBit) => sum + userBit.Bit, 0);
    const minPayout = minWinPercent * totalBetAmount;
    const maxPayout = maxWinPercent * totalBetAmount;

    function calculatePayoutForNumber(numberInfo) {
      let totalPayout = 0;
      currentGame.UsersBits.forEach((userBit) => {
        let payout = 0;
        const selectedFrame = currentGame.cardBitCoin.find((frame) => frame.selectFrame === userBit.SelectedFrame);

        if (selectedFrame) {
          if (selectedFrame.selectFrame === 1 && numberInfo.no == 0) {
            payout += userBit.Bit * 36;
          } else if (selectedFrame.selectFrame === 2 && numberInfo.no >= 1 && numberInfo.no <= 12) {
            payout += userBit.Bit * 3;
          } else if (selectedFrame.selectFrame === 3 && numberInfo.no >= 13 && numberInfo.no <= 24) {
            payout += userBit.Bit * 3;
          } else if (selectedFrame.selectFrame === 4 && numberInfo.no >= 25 && numberInfo.no <= 36) {
            payout += userBit.Bit * 3;
          }

          if (selectedFrame.selectFrame === 5 && numberInfo.color === "red") {
            payout += userBit.Bit * 2;
          } else if (selectedFrame.selectFrame === 6 && numberInfo.color === "black") {
            payout += userBit.Bit * 2;
          }

          if (selectedFrame.selectFrame === 7 && numberInfo.oddAndEven === "odd") {
            payout += userBit.Bit * 2;
          } else if (selectedFrame.selectFrame === 8 && numberInfo.oddAndEven === "even") {
            payout += userBit.Bit * 2;
          }
        }
        totalPayout += payout;
      });
      return totalPayout;
    }

    const potentialNumbers = rouletteWheelNumbers
      .filter((num) => num !== 0 && num !== 1)
      .map((number) => {
        const numberInfo = numberArray.find((num) => num.no === number);
        const totalPayout = calculatePayoutForNumber(numberInfo);
        return { number, totalPayout };
      });

    const eligibleNumbers = potentialNumbers.filter((num) => num.totalPayout >= minPayout && num.totalPayout <= maxPayout);

    if (gameCounter === nextForcedWinGame) {
      nextForcedWinGame = gameCounter + Math.floor(Math.random() * 50) + 100;
      return 36;
    }

    let selectedNumber;
    if (eligibleNumbers.length > 0) {
      const randomNum = Math.floor(Math.random() * eligibleNumbers.length);
      selectedNumber = eligibleNumbers[randomNum].number;
    } else {
      selectedNumber = potentialNumbers.reduce((minNum, num) => (num.totalPayout < minNum.totalPayout ? num : minNum)).number;
    }
    return selectedNumber;
  }

  const validNumbers = rouletteWheelNumbers.filter((num) => num !== 0 && num !== 1);
  return validNumbers[Math.floor(Math.random() * validNumbers.length)];
};

exports.selectFrame = async (number) => {
  const resultObj = numberArray.find((item) => item.no === number) || { no: number, color: "red", oddAndEven: "even" };
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

exports.isLow = async (number) => {
  const resultObj = numberArray.find((item) => item.no === number) || { no: number, color: "red", oddAndEven: "even" };
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
  if (!isNaN(bitCoin)) {
    return await gameUserBridge.updateAdminCoin('roulettecasino', bitCoin);
  }
  return await gameUserBridge.getAdminCoin('roulettecasino');
};

exports.addBet = (diamond, id) => {
  if (bet.length) {
    const index = bet.findIndex((element) => element.userId == id);
    if (index !== -1) {
      bet[index].amount += diamond;
    } else {
      bet.push({ amount: diamond, userId: id });
    }
  } else {
    bet.push({ amount: diamond, userId: id });
  }
};

exports.addGameHistory = async (data) => {
  if (currentGame.UsersBits.length !== 0) {
    await exports.gameAdminCoinUpdate(-data.winCoinPercent);
    await gameUserBridge.saveRound({
      gameSlug: 'roulettecasino',
      roundNumber: Date.now(),
      winnerOutcome: data.resultObj?.no ?? 0,
      totalBets: data.sum || 0,
      totalPayout: Math.abs(parseInt(data.winCoinPercent, 10)) || 0,
      details: {
        cardCoin: currentGame.cardBitCoin,
        winnerObj: data.resultObj,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      },
    });
  }
};

exports.coin = async () => {
  return await gameUserBridge.getAdminCoin('roulettecasino');
};

exports.createrouletteLastHistory = async () => {
  // Outcomes are queried directly from MySQL mini_game_rounds
  return [];
};

exports.allUserHistory = async (currentGame, resultObj) => {
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
  for (let index1 = 0; index1 < resultArray.length; index1++) {
    const element = resultArray[index1];
    let winCoinPercent = 0;
    for (let index = 0; index < element.BitData.length; index++) {
      const element2 = element.BitData[index];
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

    const findBetIndex = bet.findIndex((data) => data?.userId == element?.userId);
    const totalBetForUser = parseInt(bet[findBetIndex]?.amount, 10) || 0;
    const uid = bet[findBetIndex]?.userId || element?.userId;

    let winningUser = null;
    if (!isNaN(parseInt(uid, 10)) && parseInt(uid, 10) > 0) {
      if (winCoinPercent > 0) {
        await gameUserBridge.addCoins(uid, winCoinPercent, 'roulettecasino', 'Win on Roulette Casino');
        winningUser = await gameUserBridge.getUser(uid);
      }
      await gameUserBridge.saveBet({
        userId: uid,
        gameSlug: 'roulettecasino',
        roundId: Date.now(),
        betAmount: totalBetForUser,
        winAmount: winCoinPercent,
        selection: resultObj?.resultObj?.no ?? 0,
        multiplier: winCoinPercent > 0 ? (winCoinPercent / Math.max(1, totalBetForUser)).toFixed(1) : 1.0,
        status: winCoinPercent > 0 ? 'won' : 'lost',
      });
    }

    const highCoinValue = global.setting?.coinForGameAnnouncement || 1000;
    if (winCoinPercent >= highCoinValue && winningUser) {
      mainBackendSocket.emit("highBit", {
        coin: winCoinPercent,
        user: winningUser,
        game: "Roulette Casino 🎡",
      });
    }

    if (findBetIndex !== -1) {
      bet.splice(findBetIndex, 1);
    }
  }
};

exports.historyRecord = async (_id) => {
  try {
    return await gameUserBridge.getUserGameBets(_id, 'roulettecasino', 30);
  } catch (error) {
    console.error("roulette historyRecord error:", error);
    return [];
  }
};
