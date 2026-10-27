const { highCoinValue, HighCardCombination, PairCombination, ColorCombination, SequenceCombination, PureCombination, TrioCombinations } = require("./helper.js");
const { adminBaseURL } = require("./config.js");
const gameUserBridge = require("../../gameUserBridge.js");

const io = require("socket.io-client");
const mainBackendSocket = io(adminBaseURL, { reconnectionAttempts: 3, timeout: 5000 });
mainBackendSocket.on("connect", () => {
  console.log("Connected to main backend from game backend");
});
mainBackendSocket.on("connect_error", (err) => {
  console.log("Main backend socket notice:", err.message);
});

// In-memory Card Deck
let cardDeck = { cardArray: [] };

exports.cardMake = async () => {
  const probabilities = {
    Trio: 0.0024,
    Pure: 0.0022,
    Sequence: 0.0326,
    Color: 0.0496,
    Pair: 0.1694,
    HighCard: 0.7439,
  };

  const getRandomValue = (prob) => {
    const random = Math.random();
    let cumulative = 0;
    for (const key in prob) {
      cumulative += prob[key];
      if (random <= cumulative) {
        return key;
      }
    }
    return "HighCard";
  };

  const arraySize = 100;
  const resultArray = [];
  for (let i = 0; i < arraySize; i++) {
    const firstValue = getRandomValue(probabilities);
    const secondValue = getRandomValue(probabilities);
    const thirdValue = getRandomValue(probabilities);
    resultArray.push({ firstValue, secondValue, thirdValue });
  }

  cardDeck.cardArray = [...resultArray];
  return cardDeck;
};

exports.cardUpdateSplice = async () => {
  console.log("cardUpdateSplice function call");
  if (!cardDeck.cardArray || cardDeck.cardArray.length <= 1) {
    await exports.cardMake();
  }
  let uniqueRandom;
  let cardNumberWithName = [];
  let random100 = Math.floor(Math.random() * (cardDeck.cardArray.length - 1));
  let cardCombination1Obj = cardDeck.cardArray.splice(random100, 1)[0] || { firstValue: "HighCard", secondValue: "Pair", thirdValue: "Sequence" };
  const myArray = Object.values(cardCombination1Obj);

  for (let index = 0; index < 3; index++) {
    const element = myArray[index];
    if (element === "Trio") {
      do {
        uniqueRandom = Math.floor(Math.random() * TrioCombinations.length);
      } while (cardNumberWithName.includes(TrioCombinations[uniqueRandom]));
      cardNumberWithName.push(TrioCombinations[uniqueRandom]);
    } else if (element === "Pair") {
      do {
        uniqueRandom = Math.floor(Math.random() * PairCombination.length);
      } while (cardNumberWithName.includes(PairCombination[uniqueRandom]));
      cardNumberWithName.push(PairCombination[uniqueRandom]);
    } else if (element === "Color") {
      do {
        uniqueRandom = Math.floor(Math.random() * ColorCombination.length);
      } while (cardNumberWithName.includes(ColorCombination[uniqueRandom]));
      cardNumberWithName.push(ColorCombination[uniqueRandom]);
    } else if (element === "Sequence") {
      do {
        uniqueRandom = Math.floor(Math.random() * SequenceCombination.length);
      } while (cardNumberWithName.includes(SequenceCombination[uniqueRandom]));
      cardNumberWithName.push(SequenceCombination[uniqueRandom]);
    } else if (element === "Pure") {
      do {
        uniqueRandom = Math.floor(Math.random() * PureCombination.length);
      } while (cardNumberWithName.includes(PureCombination[uniqueRandom]));
      cardNumberWithName.push(PureCombination[uniqueRandom]);
    } else {
      do {
        uniqueRandom = Math.floor(Math.random() * HighCardCombination.length);
      } while (cardNumberWithName.includes(HighCardCombination[uniqueRandom]));
      cardNumberWithName.push(HighCardCombination[uniqueRandom]);
    }
  }

  if (cardNumberWithName.length !== 3) {
    cardNumberWithName = [
      { combination: [44, 456, 51, "Color"], value: 44 },
      { combination: [51, 8, 16, "HighCard"], value: 61 },
      { combination: [52, 51, 50, "Pure"], value: 15 },
    ];
  }
  return cardNumberWithName;
};

exports.gameAdminCoin = async () => {
  return await gameUserBridge.getAdminCoin('teenpatti');
};

exports.gameAdminCoinUpdate = async (bitCoin) => {
  if (!isNaN(bitCoin)) {
    return await gameUserBridge.updateAdminCoin('teenpatti', bitCoin);
  }
  return await gameUserBridge.getAdminCoin('teenpatti');
};

exports.win = async (currentGame) => {
  console.log("WIN FUNCTION call with updated index logic", currentGame);

  let totalBet = currentGame.cardBitCoin.reduce((sum, frame) => sum + frame.bit, 0);
  console.log("WIN FUNCTION call totalBet", totalBet);

  let teenPattiSetting = global.setting?.game?.find((game) => game.name === "teenpatti");
  const minWinPercent = teenPattiSetting ? teenPattiSetting.minWinPercent : 50;
  const maxWinPercent = teenPattiSetting ? teenPattiSetting.maxWinPercent : 80;

  let framesInfo = currentGame.cardBitCoin.map((frame, index) => ({
    index,
    bet: frame.bit,
    eligible:
      (frame.bit * 2.9) >= totalBet * (minWinPercent / 100) &&
      (frame.bit * 2.9) <= totalBet * (maxWinPercent / 100),
  }));

  let chosenFrameObj;
  const eligibleFrames = framesInfo.filter((info) => info.eligible);
  if (eligibleFrames.length > 0) {
    chosenFrameObj = eligibleFrames[Math.floor(Math.random() * eligibleFrames.length)];
  } else {
    chosenFrameObj = framesInfo[Math.floor(Math.random() * framesInfo.length)];
  }

  const chosenFrameIndex = chosenFrameObj.index;
  currentGame.Combinations = await exports.swapCombinationIndex(chosenFrameIndex, currentGame.Combinations);

  currentGame.cardBitCoin.forEach((frame, index) => {
    frame.winner = index === chosenFrameIndex;
  });

  let bitValueIntoPercent = -chosenFrameObj.bet * 2.9;
  let updatedGameAdminCoin = await exports.gameAdminCoinUpdate(bitValueIntoPercent);

  let cardValueArray = currentGame.Combinations.map((combo) => combo.combination[3]);

  await exports.saveGame(
    currentGame,
    chosenFrameIndex,
    bitValueIntoPercent,
    updatedGameAdminCoin,
    cardValueArray
  );

  return { combination: currentGame.Combinations, winnerIndex: chosenFrameIndex };
};

exports.bitValueDecide = async (currentGameValue) => {
  let currentGame = currentGameValue;
  const bitValues = currentGame.cardBitCoin?.map((item) => item.bit) || [0, 0, 0];
  const highBitValue = Math.max(...bitValues);
  const lowBitValue = Math.min(...bitValues);
  const sortedBits = [...bitValues].sort((a, b) => a - b);
  const midIndex = Math.floor(sortedBits.length / 2);
  const midBitValue = sortedBits[midIndex];

  return [{ highBitValue, midBitValue, lowBitValue }];
};

exports.swapCombinationIndex = async (myIndex, combination) => {
  const combinationValueArray = combination?.map((item) => item.value) || [];
  const minVal = Math.min(...combinationValueArray);
  const lowerValueIndex = combinationValueArray.indexOf(minVal);
  if (lowerValueIndex !== -1 && myIndex !== lowerValueIndex) {
    const temp = combination[lowerValueIndex];
    combination[lowerValueIndex] = combination[myIndex];
    combination[myIndex] = temp;
  }
  return combination;
};

// In-memory Winner Bit Probability Deck
let memoryWinnerBit = [];
exports.createWinnerBit = async () => {
  const probabilities = { high: 0.25, mid: 0.35, low: 0.4 };
  const totalCount = 100;
  const highCount = Math.round(probabilities.high * totalCount);
  const midCount = Math.round(probabilities.mid * totalCount);
  const lowCount = totalCount - highCount - midCount;

  const resultArray = [];
  resultArray.push(...Array(highCount).fill("high"));
  resultArray.push(...Array(midCount).fill("mid"));
  resultArray.push(...Array(lowCount).fill("low"));

  for (let i = resultArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [resultArray[i], resultArray[j]] = [resultArray[j], resultArray[i]];
  }

  memoryWinnerBit = [...resultArray];
  return memoryWinnerBit;
};

exports.winnerDeclare = async (currentGameValue, bitValueResultValue) => {
  let gameAdminCoin = await gameUserBridge.getAdminCoin('teenpatti');

  let randomValue = async () => {
    if (!memoryWinnerBit || memoryWinnerBit.length <= 1) {
      await exports.createWinnerBit();
    }
    const idx = Math.floor(Math.random() * memoryWinnerBit.length);
    return memoryWinnerBit.splice(idx, 1)[0] || "low";
  };

  let bitValueResult = bitValueResultValue;
  let winner = await randomValue();

  if (winner === "high") {
    if (gameAdminCoin <= bitValueResult[0].highBitValue * 2.9) {
      winner = "mid";
      if (gameAdminCoin <= bitValueResult[0].midBitValue * 2.9) {
        return "low";
      }
    }
  } else if (winner === "mid") {
    if (gameAdminCoin <= bitValueResult[0].midBitValue * 2.9) {
      return "low";
    }
  }
  if (!winner || winner === "undefined") {
    winner = "low";
  }
  return winner;
};

exports.saveGame = async (
  currentGame,
  winnerIndex,
  bitValueIntoPercent,
  updatedGameAdminCoin,
  cardValueArray
) => {
  let sum = 0;
  for (const item of currentGame.cardBitCoin) {
    sum += item.bit;
  }

  for (let i = 0; i < 3; i++) {
    if (i < 3) {
      currentGame.cardBitCoin[i].card = cardValueArray[i];
    }
  }
  let cardCoinArray = currentGame.cardBitCoin;
  for (const [index, item] of currentGame.cardBitCoin.entries()) {
    if (winnerIndex == index) {
      item.winner = true;
    }
  }

  const combinedEntriesMap = new Map();
  currentGame.UsersBits.forEach((entry) => {
    const key = `${entry.UserId}_${entry.SelectedFrame}`;
    if (!combinedEntriesMap.has(key)) {
      combinedEntriesMap.set(key, {
        UserId: entry.UserId,
        Bit: 0,
        SelectedFrame: entry.SelectedFrame,
      });
    }
    combinedEntriesMap.get(key).Bit += entry.Bit;
  });
  const combinedUserBits = Array.from(combinedEntriesMap.values());

  // Save to MySQL mini_game_rounds
  await gameUserBridge.saveRound({
    gameSlug: 'teenpatti',
    roundNumber: Date.now(),
    winnerOutcome: winnerIndex,
    totalBets: sum,
    totalPayout: Math.abs(parseInt(bitValueIntoPercent, 10)) || 0,
    details: {
      cardCoin: cardCoinArray,
      winnerIndex,
      userBits: combinedUserBits,
      combination: currentGame.Combinations,
      date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    },
  });
};

exports.allUserHistory = async (currentGame, result) => {
  let sumByUserAndFrame = {};
  currentGame.UsersBits.forEach((bitData) => {
    const key = bitData.UserId;
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
    const allBitValue = element.BitData.reduce((sum, item) => sum + item.Bit, 0);
    const resultFrameIndex = resultArray[index1].BitData.findIndex((item) => {
      return item?.SelectedFrame == result + 1;
    });

    let winCoinPercent = 0;
    if (resultFrameIndex !== -1) {
      const resultBitData = resultArray[index1].BitData[resultFrameIndex];
      winCoinPercent = parseInt(resultBitData?.Bit * 2.9, 10);
      let winningUser = null;

      if (!isNaN(parseInt(element?.userId, 10)) && parseInt(element?.userId, 10) > 0) {
        await gameUserBridge.addCoins(element?.userId, winCoinPercent, 'teenpatti', 'Win on Teen Patti');
        winningUser = await gameUserBridge.getUser(element?.userId);
      }

      const highCoinValue = global?.setting?.coinForGameAnnouncement || 1000;
      if (winCoinPercent >= highCoinValue && winningUser) {
        mainBackendSocket.emit("highBit", {
          coin: winCoinPercent,
          user: winningUser,
          game: "Teenpatti",
        });
      }
    }

    // Record bet in MySQL mini_game_bets
    if (!isNaN(parseInt(element?.userId, 10)) && parseInt(element?.userId, 10) > 0) {
      await gameUserBridge.saveBet({
        userId: element?.userId,
        gameSlug: 'teenpatti',
        roundId: Date.now(),
        betAmount: allBitValue,
        winAmount: winCoinPercent,
        selection: result + 1,
        multiplier: 2.9,
        status: winCoinPercent > 0 ? 'won' : 'lost',
      });
    }
  }
};
