import React, { useEffect, useRef, useState } from "react";
import SelectCricle from "./SelectCricle";
import CoinButton from "./CoinButton";
import RecordsDialog from "../Dialog/RecordsDialog";
import RulesDialog from "../Dialog/RulesDialog";
import WinnerDialog from "../Dialog/WinnerDialog";
import { ToastConent } from "../ToastConent";
import { imageShowData } from "../GiftImage";

import CoinIcon from "../assets/image/coin.png";
import BobMascot from "../assets/image/bob_mascot.png";
import HandPoint from "../assets/image/hand_point.png";
import HandPointRight from "../assets/image/hand_point_right.png";
import Winner1 from "../assets/image/winner1.png";

const CLOCKWISE_FRAMES = [3, 4, 5, 6, 7, 8, 2, 1];

const FOOD_FRAMES = [1, 2, 7, 8]; // Tomato, Carrot, Meat, Hotdog
const TOY_FRAMES = [3, 4, 5, 6];  // Balloons, Unicorn, Tricycle, Car

let selectedCoinGlobal = 100;
let selectedFramGlobal = [
  { selectFrame: 1, Bit: 0 },
  { selectFrame: 2, Bit: 0 },
  { selectFrame: 3, Bit: 0 },
  { selectFrame: 4, Bit: 0 },
  { selectFrame: 5, Bit: 0 },
  { selectFrame: 6, Bit: 0 },
  { selectFrame: 7, Bit: 0 },
  { selectFrame: 8, Bit: 0 },
];
let winnerFramGlobal = 0;
let todayProfitGlobal = 0;
let historiesShowGlobal = [8, 8, 8, 2, 2];
let gameRoundGlobal = 46;
let gameRoundWinnerShowGlobal = 0;
let winnerShowGlobal = [];
let historyRecordGlobal = [];
let currentGameGlobal = [];

const queryParams = new URLSearchParams(window.location.search);
const userId = queryParams.get("id") || "6579c2980cb6184131234567";

export default function WheelContent(props) {
  const { userData, socket, gameCoin = [10, 100, 1000, 20000], settingData } = props;
  const [selectedCoin, setSelectedCoin] = useState(100);
  const [framesState, setFramesState] = useState(selectedFramGlobal);
  const [activeRollFrame, setActiveRollFrame] = useState(0);
  const [winningFrame, setWinningFrame] = useState(0);
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [rulesDialogOpen, setRulesDialogOpen] = useState(false);
  const [winnerModelOpen, setWinnerModelOpen] = useState(false);
  const [time, setTime] = useState(25);
  const [canPressCoins, setCanPressCoins] = useState(true);
  const [timerText, setTimerText] = useState("19S");
  const [gameRound, setGameRound] = useState(46);
  const [todayProfit, setTodayProfit] = useState(0);
  const [histories, setHistories] = useState(historiesShowGlobal);
  const [historyRecords, setHistoryRecords] = useState([]);

  useEffect(() => {
    selectedCoinGlobal = gameCoin[1] || 100;
    setSelectedCoin(selectedCoinGlobal);
  }, [gameCoin]);

  useEffect(() => {
    socket?.on("time", (t) => {
      updateTime(t);
      setTime(t);
    });

    socket?.on("game", (game) => {
      currentGameGlobal = game?.UsersBits;
      if (game) {
        selectedFramGlobal = [
          { selectFrame: 1, Bit: 0 },
          { selectFrame: 2, Bit: 0 },
          { selectFrame: 3, Bit: 0 },
          { selectFrame: 4, Bit: 0 },
          { selectFrame: 5, Bit: 0 },
          { selectFrame: 6, Bit: 0 },
          { selectFrame: 7, Bit: 0 },
          { selectFrame: 8, Bit: 0 },
        ];
        updateGame(game);
      }
    });

    socket?.on("randomWinnerNumber", (winner) => {
      winnerFramGlobal = winner;
    });

    socket?.on("winnerUserArray", (winnerUser) => {
      winnerShowGlobal = winnerUser;
    });

    socket?.on("gameRound", (gameRoundNo) => {
      gameRoundGlobal = gameRoundNo;
      setGameRound(gameRoundNo);
    });

    socket?.on("todayProfit", (profit) => {
      todayProfitGlobal = profit;
      setTodayProfit(profit);
    });

    socket?.on("lastHistories", (hist) => {
      if (hist && hist.length > 0) {
        historiesShowGlobal = hist;
        setHistories(hist);
      }
    });

    socket?.on("historyRecord", (historyRecordData) => {
      historyRecordGlobal = historyRecordData;
      setHistoryRecords(Array.isArray(historyRecordData) ? historyRecordData : []);
    });
  }, [socket]);

  const rollIdxRef = useRef(0);
  const isSpinning = time <= 0 && time > -12;

  // Rolling sequence animation during spin phase
  useEffect(() => {
    let rollTimer;
    if (isSpinning) {
      // Dynamic speed: fast spin then smoothly decelerates
      const speed = time <= -11 ? 260 : time <= -9 ? 160 : 100;
      rollTimer = setInterval(() => {
        rollIdxRef.current = (rollIdxRef.current + 1) % CLOCKWISE_FRAMES.length;
        setActiveRollFrame(CLOCKWISE_FRAMES[rollIdxRef.current]);
      }, speed);
    } else if (time === -12) {
      // Land directly on winning frame on result declaration
      setActiveRollFrame(winnerFramGlobal || winningFrame);
    } else {
      setActiveRollFrame(0);
    }
    return () => clearInterval(rollTimer);
  }, [isSpinning, time, winningFrame]);


  const updateTime = (t) => {
    if (t > -12) {
      setWinningFrame((prev) => (prev !== 0 ? 0 : prev));
    }

    if (t === 25) {
      selectedCoinGlobal = gameCoin[1] || 100;
      setSelectedCoin(selectedCoinGlobal);
      setWinningFrame(0);
    }

    if (t >= 4) {
      setCanPressCoins(true);
      setTimerText(`${t}S`);
    } else if (t >= 0 && t <= 3) {
      setCanPressCoins(false);
      setTimerText(`${t}S`);
    } else if (t <= 0 && t > -12) {
      selectedFramGlobal = [
        { selectFrame: 1, Bit: 0 },
        { selectFrame: 2, Bit: 0 },
        { selectFrame: 3, Bit: 0 },
        { selectFrame: 4, Bit: 0 },
        { selectFrame: 5, Bit: 0 },
        { selectFrame: 6, Bit: 0 },
        { selectFrame: 7, Bit: 0 },
        { selectFrame: 8, Bit: 0 },
      ];
      setFramesState([...selectedFramGlobal]);
      setCanPressCoins(false);
      setTimerText(`${11 + t}S`);
    }

    if (t === -12) {
      setWinningFrame(winnerFramGlobal);
      setTimeout(() => {
        gameRoundWinnerShowGlobal = gameRoundGlobal;
        setWinnerModelOpen(true);
      }, 500);
    }

    if (t === 22) {
      setWinnerModelOpen(false);
      gameRoundWinnerShowGlobal = gameRoundGlobal;
      setWinningFrame(0);
    }

    if (t === -13) {
      socket?.emit("user", {
        _id: userData?._id,
      });
    }
  };

  const updateGame = (game) => {
    const findUser = game?.UsersBits?.filter((u) => u?.userId === userId);
    findUser?.forEach((data) => {
      const { Bit, SelectedFrame } = data;
      const gameIndex = selectedFramGlobal?.findIndex(
        (frame) => frame?.selectFrame === SelectedFrame
      );
      if (gameIndex !== -1) {
        selectedFramGlobal[gameIndex].Bit += Bit;
      }
    });
    setFramesState([...selectedFramGlobal]);
  };

  const addBit = (bitcoin, myframe) => {
    if (bitcoin > 0 && myframe > 0) {
      if ((userData?.diamond || 0) - bitcoin >= 0) {
        if (userData) userData.diamond -= bitcoin;
        socket?.emit("bit", {
          User: userData,
          Bit: bitcoin,
          SelectedFrame: myframe,
        });

        const selectedFrameIndex = selectedFramGlobal?.findIndex(
          (frame) => frame.selectFrame === myframe
        );
        if (selectedFrameIndex !== -1) {
          selectedFramGlobal[selectedFrameIndex].Bit += bitcoin;
          setFramesState([...selectedFramGlobal]);
        }
      } else {
        ToastConent("You don't have enough coins now, please recharge!", "warning");
      }
    } else {
      ToastConent("Please select a coin amount first", "info");
    }
  };

  const handleFramClick = (fram) => {
    if (!canPressCoins) {
      ToastConent("Betting is currently closed", "info");
      return;
    }
    const currentBetAmount = selectedCoin || gameCoin[1] || 100;
    addBit(currentBetAmount, fram);
  };

  const handleCategoryBet = (frames) => {
    if (!canPressCoins) {
      ToastConent("Betting is currently closed", "info");
      return;
    }
    const currentBetAmount = selectedCoin || gameCoin[1] || 100;
    const totalCost = currentBetAmount * frames.length;
    if ((userData?.diamond || 0) < totalCost) {
      ToastConent("You don't have enough coins for this category bet!", "warning");
      return;
    }
    frames.forEach((f) => {
      addBit(currentBetAmount, f);
    });
  };

  const handleSelectCoin = (coin) => {
    selectedCoinGlobal = coin;
    setSelectedCoin(coin);
  };

  const handleOpenModel = (type) => {
    if (type === "records") {
      setRecordsDialogOpen(true);
      setRulesDialogOpen(false);
      socket?.emit("historyRecord", {
        _id: userData?._id,
      });
    } else {
      setRulesDialogOpen(true);
      setRecordsDialogOpen(false);
    }
  };

  // Pod definitions with positions matching the reference screenshot:
  // Pods in a circle around Bob:
  // Top: Balloons (Frame 3, X10, pink)
  // Top-Right: Unicorn (Frame 4, X15, pink)
  // Right: Tricycle (Frame 5, X25, orange)
  // Bottom-Right: Car (Frame 6, X45, cyan)
  // Bottom: Meat (Frame 7, X5, darkblue)
  // Bottom-Left: Hotdog (Frame 8, X5, blue)
  // Left: Carrot (Frame 2, X5, blue)
  // Top-Left: Tomato (Frame 1, X5, yellow)
  const podsConfig = [
    {
      framNo: 3,
      name: "Balloons",
      image: imageShowData[2],
      multiplier: "X10",
      badgeColor: "pink",
      ringColor: "pink",
      cricleMainStyle: { left: "50%", top: "10%", transform: "translate(-50%, -50%)" },
    },
    {
      framNo: 4,
      name: "Unicorn",
      image: imageShowData[3],
      multiplier: "X15",
      badgeColor: "pink",
      ringColor: "pink",
      cricleMainStyle: { left: "79%", top: "22%", transform: "translate(-50%, -50%)" },
    },
    {
      framNo: 5,
      name: "Tricycle",
      image: imageShowData[4],
      multiplier: "X25",
      badgeColor: "pink",
      ringColor: "orange",
      cricleMainStyle: { left: "89%", top: "48%", transform: "translate(-50%, -50%)" },
    },
    {
      framNo: 6,
      name: "Car",
      image: imageShowData[5],
      multiplier: "X45",
      badgeColor: "pink",
      ringColor: "cyan",
      cricleMainStyle: { left: "79%", top: "74%", transform: "translate(-50%, -50%)" },
    },
    {
      framNo: 7,
      name: "Meat",
      image: imageShowData[6],
      multiplier: "X5",
      badgeColor: "purple",
      ringColor: "darkblue",
      cricleMainStyle: { left: "50%", top: "86%", transform: "translate(-50%, -50%)" },
    },
    {
      framNo: 8,
      name: "Hotdog",
      image: imageShowData[7],
      multiplier: "X5",
      badgeColor: "purple",
      ringColor: "blue",
      cricleMainStyle: { left: "21%", top: "74%", transform: "translate(-50%, -50%)" },
    },
    {
      framNo: 2,
      name: "Carrot",
      image: imageShowData[1],
      multiplier: "X5",
      badgeColor: "purple",
      ringColor: "blue",
      cricleMainStyle: { left: "11%", top: "48%", transform: "translate(-50%, -50%)" },
    },
    {
      framNo: 1,
      name: "Tomato",
      image: imageShowData[0],
      multiplier: "X5",
      badgeColor: "purple",
      ringColor: "yellow",
      cricleMainStyle: { left: "21%", top: "22%", transform: "translate(-50%, -50%)" },
    },
  ];

  return (
    <div className="bobs-choice-app">
      <div className="game-stage-container">
        {/* 2. Round Info & Controls Header */}
        <div className="stage-header-row">
          <div className="round-badge">{gameRound || 46} Round</div>

          <div className="action-buttons-right">
            <button
              className="amber-capsule-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModel("rules");
              }}
            >
              Rules
            </button>
            <button
              className="amber-capsule-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModel("records");
              }}
            >
              My Guesses
            </button>
          </div>
        </div>

        {/* 3. Central Ferris Wheel & Bob Stage */}
        <div className="ferris-wheel-stage">
          {/* Wheel Frame and Spokes SVG Overlay */}
          <svg className="wheel-spokes-svg" viewBox="0 0 360 360">
            {/* Ferris wheel lilac rim */}
            <circle
              cx="180"
              cy="180"
              r="135"
              stroke="#b594e8"
              strokeWidth="5"
              strokeDasharray="8 6"
              fill="none"
              opacity="0.85"
            />
            <circle
              cx="180"
              cy="180"
              r="142"
              stroke="#d9c4f7"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
            {/* Wheel Spokes radiating to the 8 pods */}
            <line x1="180" y1="180" x2="180" y2="45" stroke="#b594e8" strokeWidth="3" />
            <line x1="180" y1="180" x2="275" y2="85" stroke="#b594e8" strokeWidth="3" />
            <line x1="180" y1="180" x2="315" y2="180" stroke="#b594e8" strokeWidth="3" />
            <line x1="180" y1="180" x2="275" y2="275" stroke="#b594e8" strokeWidth="3" />
            <line x1="180" y1="180" x2="180" y2="315" stroke="#b594e8" strokeWidth="3" />
            <line x1="180" y1="180" x2="85" y2="275" stroke="#b594e8" strokeWidth="3" />
            <line x1="180" y1="180" x2="45" y2="180" stroke="#b594e8" strokeWidth="3" />
            <line x1="180" y1="180" x2="85" y2="85" stroke="#b594e8" strokeWidth="3" />

            {/* Support A-Frame struts connecting center to stage base */}
            <line x1="170" y1="180" x2="90" y2="350" stroke="#9065cb" strokeWidth="8" strokeLinecap="round" />
            <line x1="190" y1="180" x2="270" y2="350" stroke="#9065cb" strokeWidth="8" strokeLinecap="round" />
            <line x1="110" y1="300" x2="250" y2="300" stroke="#a376e3" strokeWidth="4" />
          </svg>

          {/* Central Character & Countdown Timer */}
          <div className="wheel-center-hub">
            <div className="bob-mascot-container">
              <img src={BobMascot} alt="Bob Mascot" className="bob-mascot-img" />
            </div>

            {/* Circular Golden Timer */}
            <div className="center-timer-badge">
              <span className="timer-text">{timerText || "19S"}</span>
            </div>
          </div>

          {/* 8 Circular Pods */}
          <div className="pods-container">
            {podsConfig.map((pod) => (
              <SelectCricle
                key={pod.framNo}
                image={pod.image}
                multiplier={pod.multiplier}
                badgeColor={pod.badgeColor}
                ringColor={pod.ringColor}
                cricleMainStyle={pod.cricleMainStyle}
                framNo={pod.framNo}
                selectFrame={
                  framesState.find((f) => f.selectFrame === pod.framNo) || {
                    selectFrame: pod.framNo,
                    Bit: 0,
                  }
                }
                isCurrentRoll={activeRollFrame === pod.framNo}
                isWinner={time <= -12 && winningFrame === pod.framNo}
                onClick={() => handleFramClick(pod.framNo)}
              />
            ))}
          </div>

          {/* Golden Stage Base with Marquee Lights & Gold Coins */}
          <div className="stage-base-platform">
            <div className="platform-lights-rim">
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
              <span className="marquee-bulb"></span>
            </div>
          </div>
        </div>

        {/* 4. Quick Category Bet Buttons (All Foods / All Toys) */}
        <div className="category-bets-row">
          <button
            className="quick-bet-btn btn-all-foods"
            onClick={() => handleCategoryBet(FOOD_FRAMES)}
            disabled={!canPressCoins}
          >
            <div className="quick-bet-icons">
              <span>🍅</span>
              <span>🥕</span>
              <span>🌭</span>
              <span>🍖</span>
            </div>
            <span className="quick-bet-label">All Foods</span>
            <img src={HandPointRight} alt="pointer" className="quick-bet-hand" />
          </button>

          <button
            className="quick-bet-btn btn-all-toys"
            onClick={() => handleCategoryBet(TOY_FRAMES)}
            disabled={!canPressCoins}
          >
            <div className="quick-bet-icons">
              <span>🎈</span>
              <span>🦄</span>
              <span>🚲</span>
              <span>🚗</span>
            </div>
            <span className="quick-bet-label">All Toys</span>
            <img src={HandPointRight} alt="pointer" className="quick-bet-hand" />
          </button>
        </div>

        {/* Bottom Dock: Chips, User Stats (ME, Today's Income) & Result History */}
        <div className="game-bottom-dock">
          {/* 5. Coin Denomination Chips Bar (10, 100, 1000, 20000) */}
          <div className="chips-selection-row">
            {gameCoin.map((coinVal) => (
              <CoinButton
                key={coinVal}
                number={coinVal}
                isSelected={selectedCoin === coinVal}
                isDisabled={!canPressCoins}
                funcClick={() => handleSelectCoin(coinVal)}
              />
            ))}
          </div>

          {/* 6. User Stats Bars (ME and Today's Income) */}
          <div className="user-stats-container">
            <div className="stats-capsule-bar">
              <span className="stats-label-bold">ME</span>
              <div className="stats-amount-group">
                <img src={CoinIcon} alt="gold coin" className="stats-coin-icon" />
                <span className="stats-amount-val">
                  {userData?.diamond !== undefined
                    ? userData?.diamond?.toLocaleString()
                    : "0"}
                </span>
              </div>
            </div>

            <div className="stats-capsule-bar">
              <span className="stats-label-regular">Today's Income</span>
              <div className="stats-amount-group">
                <img src={CoinIcon} alt="gold coin" className="stats-coin-icon" />
                <span className="stats-amount-val">
                  {todayProfit !== undefined ? todayProfit?.toLocaleString() : "0"}
                </span>
              </div>
            </div>
          </div>

          {/* 7. Bottom Results History */}
          <div className="bottom-widgets-row">
            {/* Result Card (Full Width) */}
            <div className="result-card result-card-full">
              <div className="result-card-header">
                <span>Result</span>
              </div>
              <div className="result-card-items">
                {histories && histories.length > 0 ? (
                  histories.slice(0, 8).map((winnerNum, idx) => (
                    <div key={idx} className="result-item-badge">
                      {idx === 0 && <span className="result-new-tag">New</span>}
                      <img
                        src={imageShowData[winnerNum - 1] || imageShowData[0]}
                        alt="winning item"
                        className="result-item-img"
                      />
                    </div>
                  ))
                ) : (
                  <span className="no-result-text">Waiting for results...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <RecordsDialog
        open={recordsDialogOpen}
        historyRecord={historyRecords}
        setOpen={setRecordsDialogOpen}
      />
      <RulesDialog open={rulesDialogOpen} setOpen={setRulesDialogOpen} />
      <WinnerDialog
        open={winnerModelOpen}
        setOpen={setWinnerModelOpen}
        winnerShow={winnerShowGlobal}
        currentGame={currentGameGlobal}
        userData={userData}
        gameRound={gameRoundWinnerShowGlobal}
      />
    </div>
  );
}
