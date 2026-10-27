const helper = require("./helper");
const config = require("./config");
const gameUserBridge = require("../../gameUserBridge.js");
const io = require("socket.io-client");

const GAME_SLUG = "ferrywheel";
const mainBackendSocket = io(config.adminBaseURL, { reconnectionAttempts: 3, timeout: 5000 });
mainBackendSocket.on("connect", () => {
  console.log(`Connected to main backend from ${GAME_SLUG} backend`);
});
mainBackendSocket.on("connect_error", (err) => {
  console.log(`${GAME_SLUG} main backend socket notice:`, err.message);
});

exports.RandomResult = async () => {
  if (currentGame.UsersBits?.length !== 0) {
    const allBetsAmount = currentGame.UsersBits.reduce((sum, userBit) => sum + userBit.Bit, 0);
    const gameSettings =
      global.setting && Object.keys(global.setting).length !== 0
        ? global.setting.game?.find((game) => game.name === GAME_SLUG)
        : null;

    const minWinPercent = gameSettings ? gameSettings.minWinPercent / 100 : 0.25;
    const maxWinPercent = gameSettings ? gameSettings.maxWinPercent / 100 : 1;

    const minPayout = minWinPercent * allBetsAmount;
    const maxPayout = maxWinPercent * allBetsAmount;

    function calculatePayoutForFrame(frameInfo) {
      return currentGame.UsersBits.reduce((total, userBit) => {
        const selectedFrame = currentGame.frameBitCoin.find((frame) => frame.selectFrame === userBit.SelectedFrame);
        if (selectedFrame && selectedFrame.selectFrame === frameInfo.frame) {
          const frameMultiplier = helper.frameWinnerTimes[`frame${frameInfo.frame}`] || 1;
          return total + userBit.Bit * frameMultiplier;
        }
        return total;
      }, 0);
    }

    const potentialFrames = Array.from({ length: 8 }, (_, i) => i + 1).map((frame) => {
      const totalPayout = calculatePayoutForFrame({ frame });
      return { frame, totalPayout };
    });

    const eligibleFrames = potentialFrames.filter(
      (frame) => frame.totalPayout >= minPayout && frame.totalPayout <= maxPayout
    );

    let selectedFrame;
    if (eligibleFrames.length > 0) {
      selectedFrame = eligibleFrames[Math.floor(Math.random() * eligibleFrames.length)];
    } else {
      selectedFrame = potentialFrames.reduce((minFrame, frame) =>
        frame.totalPayout < minFrame.totalPayout ? frame : minFrame
      );
    }

    const winningFrame = currentGame.frameBitCoin.find((frame) => frame.selectFrame === selectedFrame.frame) || {
      selectFrame: selectedFrame.frame,
    };
    const winCoinPercentValue = calculatePayoutForFrame({ frame: winningFrame.selectFrame });

    return {
      number: winningFrame.selectFrame,
      winCoinPercent: winCoinPercentValue,
      winnerNumberTimes: helper.frameWinnerTimes[`frame${winningFrame.selectFrame}`] || 5,
    };
  }

  const validFrames = Array.from({ length: 8 }, (_, i) => i + 1);
  const randomDefaultWinner = validFrames[Math.floor(Math.random() * validFrames.length)];

  return {
    number: randomDefaultWinner,
    winCoinPercent: 0,
    winnerNumberTimes: helper.frameWinnerTimes[`frame${randomDefaultWinner}`] || 5,
  };
};

exports.selectFrame = async (number) => {
  let winCoinPercent = 0;
  let winnerNumberTimes = helper.frameWinnerTimes[`frame${number}`] || 5;

  const targetFrame = currentGame.frameBitCoin.find((f) => f.selectFrame === number);
  if (targetFrame) {
    targetFrame.winner = true;
    winCoinPercent = targetFrame.bit * winnerNumberTimes;
  }

  return { number, winCoinPercent, winnerNumberTimes };
};

exports.gameAdminCoinUpdate = async (bitCoin) => {
  if (!isNaN(bitCoin)) {
    return await gameUserBridge.updateAdminCoin(GAME_SLUG, bitCoin);
  }
  return await gameUserBridge.getAdminCoin(GAME_SLUG);
};

exports.addBet = (diamond, id) => {
  if (betG.length) {
    const index = betG.findIndex((element) => element.userId == id);
    if (index !== -1) {
      betG[index].amount += diamond;
    } else {
      betG.push({ amount: diamond, userId: id });
    }
  } else {
    betG.push({ amount: diamond, userId: id });
  }
};

exports.addUserBits = (diamond, frame, id) => {
  if (currentGame.UsersBits.length) {
    const index = currentGame.UsersBits.findIndex((element) => element.userId == id && element.SelectedFrame == frame);
    if (index !== -1) {
      currentGame.UsersBits[index].Bit += diamond;
    } else {
      currentGame.UsersBits.push({
        Bit: diamond,
        SelectedFrame: frame,
        userId: id,
        createdAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      });
    }
  } else {
    currentGame.UsersBits.push({
      Bit: diamond,
      SelectedFrame: frame,
      userId: id,
      createdAt: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    });
  }
};

exports.addGameHistory = async (data) => {
  let sum = 0;
  for (const item of currentGame.frameBitCoin) {
    sum += item.bit;
  }
  await exports.gameAdminCoinUpdate(-data.winCoinPercent);

  await gameUserBridge.saveRound({
    gameSlug: GAME_SLUG,
    roundNumber: Date.now(),
    winnerOutcome: data.number,
    totalBets: sum,
    totalPayout: Math.abs(parseInt(data.winCoinPercent, 10)) || 0,
    details: {
      frameBitCoin: currentGame.frameBitCoin,
      winnerNumber: data.number,
      winnerNumberTimes: data.winnerNumberTimes,
      date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    },
  });
};

exports.createAdminCoin = async () => {
  return await gameUserBridge.getAdminCoin(GAME_SLUG);
};

exports.createHistoryWinnerNumber = async () => {
  return [];
};

exports.allUserHistory = async (currentGame, result) => {
  winnerUserArrayG = [];
  let sumByUserAndFrame = {};
  currentGame.UsersBits.forEach((bitData) => {
    const key = bitData.userId;
    if (!sumByUserAndFrame[key]) {
      sumByUserAndFrame[key] = {
        userId: key,
        BitData: [{ Bit: bitData.Bit, SelectedFrame: bitData.SelectedFrame }],
      };
    } else {
      const existingFrameIndex = sumByUserAndFrame[key].BitData.findIndex(
        (item) => item.SelectedFrame === bitData.SelectedFrame
      );
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
    const resultFrameIndex = resultArray[index1].BitData.findIndex((item) => item?.SelectedFrame == result);

    let winCoinPercent = 0;
    if (resultFrameIndex !== -1) {
      const resultBitData = resultArray[index1].BitData[resultFrameIndex];
      const frameMultiplier = helper.frameWinnerTimes[`frame${result}`] || 5;
      winCoinPercent = resultBitData.Bit * frameMultiplier;

      if (winCoinPercent > 0) {
        let winningUser = null;
        if (!isNaN(parseInt(element?.userId, 10)) && parseInt(element?.userId, 10) > 0) {
          await gameUserBridge.addCoins(element?.userId, winCoinPercent, GAME_SLUG, `Win on ${GAME_SLUG}`);
          winningUser = await gameUserBridge.getUser(element?.userId);
        }

        if (winningUser) {
          winnerUserArrayG.push({ ...winningUser, userWinCoin: winCoinPercent });
        }

        const announceThreshold = global.setting?.coinForGameAnnouncement || 1000;
        if (winCoinPercent >= announceThreshold && winningUser) {
          mainBackendSocket.emit("highBit", {
            coin: winCoinPercent,
            user: winningUser,
            game: "Ferry Wheel 🎡",
          });
        }
      }
    }

    const findBetIndex = betG.findIndex((data) => data?.userId == element?.userId);
    const totalBetForUser = parseInt(betG[findBetIndex]?.amount, 10) || 0;

    if (!isNaN(parseInt(element?.userId, 10)) && parseInt(element?.userId, 10) > 0) {
      await gameUserBridge.saveBet({
        userId: element?.userId,
        gameSlug: GAME_SLUG,
        roundId: Date.now(),
        betAmount: totalBetForUser,
        winAmount: winCoinPercent,
        selection: result,
        multiplier: helper.frameWinnerTimes[`frame${result}`] || 1,
        status: winCoinPercent > 0 ? 'won' : 'lost',
      });
    }

    if (findBetIndex !== -1) {
      betG.splice(findBetIndex, 1);
    }
  }
};

exports.historyRecord = async (_id) => {
  return await gameUserBridge.getUserGameBets(_id, GAME_SLUG, 50);
};

exports.todayProfit = async (_id) => {
  return await gameUserBridge.getTodayProfit(_id, GAME_SLUG);
};
