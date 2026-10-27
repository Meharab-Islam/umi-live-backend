const Card = require("./model/cardSchema");
const GameHistory = require("./model/GameHistorySchema.js");
const GameAdminCoin = require("./model/gameAdminCoinSchema.js");
const WinnerBit = require("./model/winnerBitSchema.js");
const User = require("./model/userSchema.js");
const Wallet = require("./model/wallet.js");

const { highCoinValue, HighCardCombination, PairCombination, ColorCombination, SequenceCombination, PureCombination, TrioCombinations } = require("./helper.js");
const { adminBaseURL } = require("./config.js");

const io = require("socket.io-client");
const mainBackendSocket = io(adminBaseURL, { reconnectionAttempts: 3, timeout: 5000 });
mainBackendSocket.on("connect", () => {
  console.log("Connected to main backend from game backend");
});
mainBackendSocket.on("connect_error", (err) => {
  console.log("Main backend socket notice:", err.message);
});

exports.cardUpdateSplice = async () => {
  console.log("cardUpdateSplice function call");
  let card = await Card.findOne();
  let cardNumberWithName = [];
  let uniqueRandom;
  if (!card || card?.cardArray.length == 1 || card?.cardArray.length == 0) {
    card = await this.cardMake();
  }
  let random100 = Math.floor(Math.random() * card.cardArray.length - 1);
  let cardCombination1Obj = card.cardArray.splice(random100, 1)[0];
  await card.save();
  const myArray = Object.values(cardCombination1Obj);
  //myArray : [ 'Trio', 'HighCard', 'Pair' ]

  for (let index = 0; index < 3; index++) {
    const element = myArray[index];
    if (element == "Trio") {
      do {
        uniqueRandom = Math.floor(Math.random() * TrioCombinations.length);
      } while (cardNumberWithName.includes(TrioCombinations[uniqueRandom]));

      cardNumberWithName.push(TrioCombinations[uniqueRandom]);
    }
    if (element == "Pair") {
      do {
        uniqueRandom = Math.floor(Math.random() * PairCombination.length);
      } while (cardNumberWithName.includes(PairCombination[uniqueRandom]));

      cardNumberWithName.push(PairCombination[uniqueRandom]);
    }
    if (element == "Color") {
      do {
        uniqueRandom = Math.floor(Math.random() * ColorCombination.length);
      } while (cardNumberWithName.includes(ColorCombination[uniqueRandom]));

      cardNumberWithName.push(ColorCombination[uniqueRandom]);
    }
    if (element == "Sequence") {
      do {
        uniqueRandom = Math.floor(Math.random() * SequenceCombination.length);
      } while (cardNumberWithName.includes(SequenceCombination[uniqueRandom]));

      cardNumberWithName.push(SequenceCombination[uniqueRandom]);
    }
    if (element == "Pure") {
      do {
        uniqueRandom = Math.floor(Math.random() * PureCombination.length);
      } while (cardNumberWithName.includes(PureCombination[uniqueRandom]));

      cardNumberWithName.push(PureCombination[uniqueRandom]);
    }

    if (element == "HighCard") {
      do {
        uniqueRandom = Math.floor(Math.random() * HighCardCombination.length);
      } while (cardNumberWithName.includes(HighCardCombination[uniqueRandom]));

      cardNumberWithName.push(HighCardCombination[uniqueRandom]);
    }
  }
  if (!cardNumberWithName.length == 3) {
    // any error ... then default pages
    cardNumberWithName = [
      { combination: [44, 456, 51, "Color"], value: 44 },
      { combination: [51, 8, 16, "HighCard"], value: 61 },
      { combination: [52, 51, 50, "Pure"], value: 15 },
    ];
  }
  return cardNumberWithName;
};


exports.gameAdminCoin = async () => {
  let gameAdminCoin = await GameAdminCoin.findOne();
  if (!gameAdminCoin) {
    gameAdminCoin = await GameAdminCoin();
    await gameAdminCoin.save();
  }
  return gameAdminCoin.coin;
};

exports.win = async (currentGame) => {
  console.log("WIN FUNCTION call with updated index logic", currentGame);

  // Calculate total bet from all frames
  let totalBet = currentGame.cardBitCoin.reduce((sum, frame) => sum + frame.bit, 0);
  console.log("WIN FUNCTION call totalBet", totalBet);

  // Get game settings for teenpatti and default to 50%-80% if not set
  let teenPattiSetting = global.setting?.game?.find((game) => game.name === "teenpatti");
  const minWinPercent = teenPattiSetting ? teenPattiSetting.minWinPercent : 50;
  const maxWinPercent = teenPattiSetting ? teenPattiSetting.maxWinPercent : 80;
  console.log("WIN FUNCTION minWinPercent", minWinPercent, maxWinPercent);

  // Build array of frame info including eligibility based on (bet * multiplier)
  let framesInfo = currentGame.cardBitCoin.map((frame, index) => ({
    index,
    bet: frame.bit,
    eligible:
      (frame.bit * 2.9) >= totalBet * (minWinPercent / 100) &&
      (frame.bit * 2.9) <= totalBet * (maxWinPercent / 100)
  }));


  const minAmount = totalBet * (minWinPercent / 100);
  const maxAmount = totalBet * (maxWinPercent / 100);


  console.log("WIN FUNCTION minAmount", minAmount, maxAmount);
  console.log("WIN FUNCTION framesInfo", framesInfo);

  // Determine winning frame: choose eligible frame with lowest bet or lowest overall if none eligible
  let chosenFrameObj;
  const eligibleFrames = framesInfo.filter((info) => info.eligible);

  console.log("eligibleFrames", eligibleFrames);
  if (eligibleFrames.length > 0) {
    // Choose a random frame from eligible frames
    chosenFrameObj = eligibleFrames[Math.floor(Math.random() * eligibleFrames.length)];
  } else {
    // If no eligible frames, choose randomly from all frames
    chosenFrameObj = framesInfo[Math.floor(Math.random() * framesInfo.length)];
  }

  console.log("WIN FUNCTION chosenFrameObj", chosenFrameObj);

  // Get the index of the winning frame
  const chosenFrameIndex = chosenFrameObj.index;

  // Swap in the best (lowest-value) card into the winning frame's slot
  currentGame.Combinations = await exports.swapCombinationIndex(chosenFrameIndex, currentGame.Combinations);
  // console.log("Updated Combinations after swap:", currentGame.Combinations);

  // Mark the winning frame
  currentGame.cardBitCoin.forEach((frame, index) => {
    frame.winner = index === chosenFrameIndex;
  });
  console.log("Selected winner frame index:", chosenFrameIndex, "with bet:", chosenFrameObj.bet);

  // Calculate the admin coin update using multiplier 2.9 and update admin coin
  let bitValueIntoPercent = -chosenFrameObj.bet * 2.9;
  let updatedGameAdminCoin = await exports.gameAdminCoinUpdate(bitValueIntoPercent);

  // Prepare card values (assuming the 4th element holds the card name)
  let cardValueArray = currentGame.Combinations.map((combo) => combo.combination[3]);

  // Save the game history and update balances
  await exports.saveGame(
    currentGame,
    chosenFrameIndex,
    bitValueIntoPercent,
    updatedGameAdminCoin,
    cardValueArray
  );

  console.log("WIN FUNCTION call currentGame.Combinations", currentGame.Combinations, "winnerIndex", chosenFrameIndex);
  return { combination: currentGame.Combinations, winnerIndex: chosenFrameIndex };
};

exports.bitValueDecide = async (currentGameValue) => {
  console.log("BITValue decide function call ", currentGameValue);
  //find which bit is high , mid , low
  let currentGame = currentGameValue;

  const bitValues = currentGame.cardBitCoin?.map((item) => item.bit);

  const highBitValue = Math.max(...bitValues);
  const lowBitValue = Math.min(...bitValues);

  const sortedBits = bitValues.sort((a, b) => a - b);
  const midIndex = Math.floor(sortedBits.length / 2);
  const midBitValue = sortedBits[midIndex];

  console.log("bitValue : ", highBitValue, midBitValue, lowBitValue);
  return [
    {
      highBitValue: highBitValue,
      midBitValue: midBitValue,
      lowBitValue: lowBitValue,
    },
  ];
};

exports.swapCombinationIndex = async (myIndex, combination) => {

  const combinationValueArray = combination?.map((item) => item.value);
  const minVal = Math.min(...combinationValueArray);
  const lowerValueIndex = combinationValueArray.indexOf(minVal);
  console.log("lowerValueIndex : ", lowerValueIndex);
  // Swap the combination at lowerValueIndex with myIndex
  if (lowerValueIndex !== -1 && myIndex !== lowerValueIndex) {
    const temp = combination[lowerValueIndex];
    combination[lowerValueIndex] = combination[myIndex];
    combination[myIndex] = temp;
  }

  console.log("SWAP FUNCTION FINISH == COMBINATION : ", combination);
  return combination;
};

exports.createWinnerBit = async () => {
  console.log("createWinnerBit function call");
  let winnerBit = await WinnerBit.findOne();

  if (!winnerBit) {
    winnerBit = await WinnerBit();
  }

  const probabilities = {
    high: 0.25,
    mid: 0.35,
    low: 0.4,
  };

  // Create an array of size 100
  const resultArray = [];
  const totalCount = 100;

  // Determine the number of occurrences for each item based on probabilities
  const highCount = Math.round(probabilities.high * totalCount);
  const midCount = Math.round(probabilities.mid * totalCount);
  const lowCount = totalCount - highCount - midCount;

  // Helper function to shuffle an array
  let shuffleArray = async (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  // Populate the result array with items based on their counts
  resultArray.push(...Array(highCount).fill("high"));
  resultArray.push(...Array(midCount).fill("mid"));
  resultArray.push(...Array(lowCount).fill("low"));

  // Shuffle the result array to randomize the order
  await shuffleArray(resultArray);
  winnerBit.winner = [];
  winnerBit.winner.push(...resultArray);
  console.log("resultArray  IN createWinnerBit function call", winnerBit);

  await winnerBit.save();
  return winnerBit; // ["high", "mid", "low"...................100]
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



exports.winnerDeclare = async (currentGameValue, bitValueResultValue) => {
  console.log(
    "winnerDeclare function call",
    currentGameValue?.Combinations,
    currentGameValue?.cardBitCoin
  );
  let gameAdminCoinId = await GameAdminCoin.findOne();
  if (!gameAdminCoinId) {
    gameAdminCoinId = new GameAdminCoin();
    gameAdminCoinId.coin = 0;
    await gameAdminCoinId.save();
  }

  let randomValue = async () => {
    let winnerBit = await WinnerBit.findOne();
    if (
      !winnerBit ||
      winnerBit.winner.length == "undefined" ||
      winnerBit.winner.length == 1 ||
      winnerBit.winner.length == 0
    ) {
      winnerBit = await this.createWinnerBit();
    }
    let random100 = Math.floor(Math.random() * winnerBit.winner?.length - 1);

    let result = winnerBit.winner.splice(random100, 1)[0]; // result is remove from the winnerBit
    await winnerBit.save();
    return result; // "high" or " mid" or "low"
  };

  let bitValueResult = bitValueResultValue;

  let determineWinner = async (gameAdminCoinId) => {
    console.log("determineWinner function call  : ");
    let gameAdminCoin = gameAdminCoinId.coin;
    let winner = await randomValue();
    // winner : "high"

    //winner check with adminCoin and then declare final winner [ verify adminCoin is not going to in minus coin]
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
    if (winner == "undefined") {
      winner = "low";
    }
    return winner;
  };
  const finalWinner = await determineWinner(gameAdminCoinId);
  console.log("The final winner is :", finalWinner);
  return finalWinner; // "mid"
};

exports.cardMake = async (req, res) => {
  let card = await Card.findOne();
  if (!card) {
    card = await Card();
  }
  const probabilities = {
    Trio: 0.0024, //  probability for a trios
    Pure: 0.0022, //  probability for pure
    Sequence: 0.0326, // probability for a square
    Color: 0.0496, //  probability for same color
    Pair: 0.1694, // probability for a pair
    HighCard: 0.7439, // probability for a high card
  };

  const getRandomValue = (probabilities) => {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const key in probabilities) {
      cumulativeProbability += probabilities[key];
      if (random <= cumulativeProbability) {
        return key;
      }
    }
  };

  const arraySize = 100;
  const resultArray = [];
  for (let i = 0; i < arraySize; i++) {
    const firstValue = getRandomValue(probabilities);
    const secondValue = getRandomValue(probabilities);
    const thirdValue = getRandomValue(probabilities);

    resultArray.push({ firstValue, secondValue, thirdValue });
  }

  card.cardArray = [];
  card.cardArray.push(...resultArray);
  await card.save();
  return card;
};


exports.saveGame = async (
  currentGame,
  winnerIndex,
  bitValueIntoPercent,
  updatedGameAdminCoin,
  cardValueArray
) => {
  console.log(
    " ==================================> SAVE GAME <=========================================",
    currentGame.Combinations,
    winnerIndex,
    bitValueIntoPercent,
    updatedGameAdminCoin
  );

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
  let gameHistory = new GameHistory({
    cardCoin: cardCoinArray,
    totalAdd: sum, // total add coin in game
    winnerCoinMinus: parseInt(bitValueIntoPercent), // winner card coin * 2.9
    updatedAdminCoin: parseInt(updatedGameAdminCoin),
    winnerIndex: winnerIndex,
    userBits: combinedUserBits,
    combination: currentGame.Combinations,
    date: new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    }),
  });

  await gameHistory.save();
  console.log(
    " ==================================> SAVE GAME FINISH<=========================================  gameHistory",
    gameHistory
  );
};

exports.allUserHistory = async (currentGame, result) => {
  console.log("allUserHistory==================================");

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
  console.log(
    "resultArray  ========= +++++++++++++++++++++++++++++++++++++++:",
    resultArray
  );

  //  resultArray : [ { userId: '12200', BitData: [ { Bit: 100, SelectedFrame: 2 } , { Bit: 500, SelectedFrame: 1 }] },
  //   { userId: '122', BitData: [ { Bit: 100, SelectedFrame: 2 }] }]
  for (let index1 = 0; index1 < resultArray.length; index1++) {
    const element = resultArray[index1]; // { userId: '12200', BitData: [ { Bit: 100, SelectedFrame: 2 } , { Bit: 500, SelectedFrame: 1 }] }
    console.log("loop =========== :", element);
    const allBitValue = element.BitData.reduce(
      (sum, item) => sum + item.Bit,
      0
    );
    const resultFrameIndex = resultArray[index1].BitData.findIndex((item) => {
      if (item?.SelectedFrame == result + 1) return true;
      return false;
    });
    console.log("resultFrameIndex =========== :", resultFrameIndex);

    let resultBitData;
    let winCoinPercent = 0;
    if (resultFrameIndex !== -1) {
      resultBitData = resultArray[index1].BitData[resultFrameIndex];
      winCoinPercent = parseInt(resultBitData?.Bit * 2.9);
      console.log("winCoinPercent :", winCoinPercent);
      const user = await User.findById(element?.userId);
      console.log("user?.diamond : ", user?.diamond);
      const user2 = await User.findOneAndUpdate(
        { _id: element?.userId },
        {
          $inc: { diamond: winCoinPercent },
        },
        { new: true }
      );

      const highCoinValue = global?.setting?.coinForGameAnnouncement;
      if (winCoinPercent >= highCoinValue) {
        mainBackendSocket.emit("highBit", {
          coin: winCoinPercent,
          user: user2,
          game: "Teenpatti",
        });
      }
    }

    const income = winCoinPercent - allBitValue;
    let history;
    if (!isNaN(income)) {
      if (income <= 0) {
        history = {
          userId: element?.userId,
          isIncome: false,
          type: 10,
          diamond: Math.abs(income),
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        };
      } else {
        history = {
          userId: element?.userId,
          isIncome: true,
          type: 10,
          diamond: Math.floor(income),
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        };
      }
      await Wallet(history).save();
    }
    console.log(
      "MAIN HISTORY ++++++++++++++++++++++++++++++++++++++ income",
      income,
      "+++++++++++++"
    );
  }
};


const tokenValues = [10, 200, 300, 400, 500];
const totalFrames = 3; // You mentioned 3 frames (e.g., 0, 1, 2)

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getRandomBoolean() {
  return Math.random() < 0.5;
}

// exports.generateFakeBet = (currentGame) => {
//   if (getRandomBoolean()) {
//     const fakeBit = {
//       Bit: getRandomFromArray(tokenValues),
//       SelectedFrame: Math.floor(Math.random() * totalFrames) + 1,
//       isFake: true,
//       Left: Math.random() * 55 + 5,
//       Top: Math.random() * 45 + 0,
//     };

//     currentGame.UsersBits.push(fakeBit);
//     console.log("Fake bet added:", fakeBit);
//   }
// };

