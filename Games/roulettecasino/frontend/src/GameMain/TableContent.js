import React, { useEffect, useState } from "react";
import TableImg from "../assets/Table.png";
import coin2k from "../assets/2K.png";
import coin5k from "../assets/5K.png";
import coin10k from "../assets/10K.png";
import coin20k from "../assets/20K.png";
import coin50k from "../assets/50K.png";
import { ReactComponent as UsersIcon } from "../assets/usersIcon.svg";
import CoinBtn from "./CoinButton";
import DiamondIcon from "../assets/diamond.png";
import { ReactComponent as QuestionIcon } from "../assets/questionIcon.svg";
import audioPath from "../assets/audio/coinsSound.mp3";
import Frame from "./Frame";
import { ReactComponent as SoundUpIcon } from "../assets/soundUp.svg";
import { ReactComponent as SoundMuteIcon } from "../assets/soundMute.svg";
import { ToastConent } from "./ToastConent";
import WinnerModel from "./WinnerModel";
import axios from "axios";
import { adminBaseURL } from "../App";
import HistoryOpenModel from "./BetHistoryModel";
import BetHistoryModel from "./BetHistoryModel";

const generateRandomNumber = (min, max) => {
  return Math.random() * (max - min) + min;
};

const generateRandomBit = () => {
  const possibleBits = [100, 200, 300, 400, 500];
  const randomIndex = Math.floor(Math.random() * possibleBits.length);
  return possibleBits[randomIndex];
};
const queryParams = new URLSearchParams(window.location.search);
const userIdFine = queryParams.get("id") || "6579c2980cb6184131234567";

const generateRandomFrame = () => {
  return Math.floor(Math.random() * 8) + 1;
};

const generateRandomData = () => {
  const numberOfEntries = 500; // Change this to the desired number of entries
  const generatedData = [];

  for (let i = 0; i < numberOfEntries; i++) {
    const newData = {
      UserId: "6527da15bdfb0b7c39fd700f",
      Bit: generateRandomBit(),
      SelectedFrame: generateRandomFrame(),
      Left: generateRandomNumber(0, 80),
      Top: generateRandomNumber(0, 50),
    };

    generatedData.push(newData);
  }

  return generatedData;
};

const objData = [
  {
    UserId: "6527da15bdfb0b7c39fd700f",
    Bit: 400,
    SelectedFrame: 3,
    Left: 41.42323062652059,
    Top: 43.997916312217406,
  },
];

let updatedUserBalance = false;
let selectedCoin = 0;
let currentGame = {};
let arrCoins = [[], [], [], [], [], [], [], []];
let mineCoin = [[], [], [], [], [], [], [], []];
let framesTotalMine = [0, 0, 0, 0, 0, 0, 0, 0];
let framesTotalCoins = [0, 0, 0, 0, 0, 0, 0, 0];
let totalBetCoin = 0;
let totalMineBetCoin = 0;
let winningFrames = [];
let resultNo = {
  no: "0",
  color: "green",
  oddAndEven: "odd",
};
let winTotal = [];
let mineTotalWin = 0;
let openModel = false;

let ribbons = [
  [false, 0, ""],
  [false, 0, ""],
  [false, 0, ""],
  [false, 0, ""],
  [false, 0, ""],
  [false, 0, ""],
  [false, 0, ""],
  [false, 0, ""],
];

export default function TableContent(props) {
  const {
    startTime,
    userData,
    setGameCoin,
    gameCoin,
    socketRef,
    resultShow,
    muteSound,
    handleMuteSound,
    handleOpenModel,
    resultOld,
    isActive,
  } = props;
  const defaultCoins = [100, 200, 300, 400, 500];
  const safeGameCoin = (Array.isArray(gameCoin) && gameCoin.length >= 5) ? gameCoin : defaultCoins;
  const [canPressCoins, setCanPressCoins] = useState(true);
  const [clockTime, setClockTime] = useState(0);
  const [user, setUser] = useState({});
  const [timerText, setTimerText] = useState("0s");
  const [isVisibleTimer, setIsVisibleTimer] = useState(0);
  const [winCoin, setWinCoin] = useState(0);
  const [userBitData, setUserBitData] = useState(generateRandomData());
  const [isOpen, setIsOpen] = useState(false);
  const [resultData, setResultData] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    socketRef.current?.on("time", (time) => {
      updateTime(time);
      setClockTime(time);
    });

    socketRef.current?.on("game", (game) => {
      if (game?.UsersBits?.length > 0) {
        mineCoin = [];
        arrCoins = [];
      }
      currentGameFucntion(game);
    });

    socketRef.current?.on("bit", (obj) => {
      updateGame(obj);
      playSoundFunction();
    });

    socketRef.current?.on("gameNumberHistory", (history) => {
      setHistoryData(history);
    });
  }, [socketRef?.current]);

  const playSoundFunction = async () => {
    let audio = new Audio(audioPath);

    audio.volume = muteSound ? 0 : 1;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      try {
        await playPromise;
        // Audio started playing
      } catch (error) {
        // Handle potential errors
        console.error("Error playing audio:", error);
      }
    }
  };

  const updateTime = (time) => {
    if (time === 19) {
      selectedCoin = safeGameCoin[0];
      setIsVisibleTimer(0);
    }
    if (time >= 4) {
      setCanPressCoins(true);
      setIsVisibleTimer(1);
      updatedUserBalance = false;
      setTimerText(time + "s");
    } else if (time >= 0 && time <= 3) {
      // setCanCardShow(true);
      setCanPressCoins(false);
      setIsVisibleTimer(1);
      updatedUserBalance = false;
      setTimerText(time + "s");
    } else if (time <= -1 && time > -12) {
      selectedCoin = -1;
      setCanPressCoins(false);
      setIsVisibleTimer(0);
      setTimeout(() => {
        winningFrames = getWinningFrames(currentGame?.cardBitCoin);
        resultNo = currentGame?.resultObj;
      }, 5200);
      if (
        currentGame !== undefined &&
        // currentGame !== {} &&
        currentGame?.Combinations !== undefined &&
        currentGame?.Combinations.length === 3
      ) {
      }
    } else if (time == -12) {
      if (
        !updatedUserBalance &&
        currentGame != undefined &&
        currentGame != {} &&
        currentGame?.Combinations != undefined
      ) {
        updatedUserBalance = true;
        let value1 = currentGame?.Combinations[0]?.value;
        let value2 = currentGame?.Combinations[1]?.value;
        let value3 = currentGame?.Combinations[2]?.value;
        let value4 = currentGame?.Combinations[3]?.value;
        let value5 = currentGame?.Combinations[4]?.value;
        let value6 = currentGame?.Combinations[5]?.value;
        let value7 = currentGame?.Combinations[6]?.value;
        let value8 = currentGame?.Combinations[7]?.value;

        let idx = -1;
        if (value1 <= value2 && value1 <= value3) {
          idx = 0;
        } else if (value2 <= value1 && value2 <= value3) {
          idx = 1;
        } else if (value3 <= value2 && value3 <= value1) {
          idx = 2;
        }

        if (idx >= 0) {
          let totalMineCoin =
            framesTotalMine[0] + framesTotalMine[1] + framesTotalMine[2];

          // socket.emit("totalMineCoin", totalMineCoin, user._id);

          var amount_per_coin;
          if (ribbons[0][1] == 1) {
            amount_per_coin = framesTotalMine[0] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[0] * 2.8;
          } else if (ribbons[1][2] == 1) {
            amount_per_coin = framesTotalMine[1] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[1] * 2.8;
          } else if (ribbons[2][3] == 1) {
            amount_per_coin = framesTotalMine[2] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[2] * 2.8;
          } else if (ribbons[3][4] == 1) {
            amount_per_coin = framesTotalMine[3] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[3] * 2.8;
          } else if (ribbons[4][5] == 1) {
            amount_per_coin = framesTotalMine[4] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[4] * 2.8;
          } else if (ribbons[5][6] == 1) {
            amount_per_coin = framesTotalMine[5] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[5] * 2.8;
          } else if (ribbons[6][7] == 1) {
            amount_per_coin = framesTotalMine[6] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[6] * 2.8;
          } else {
            amount_per_coin = framesTotalMine[7] * 2.8;
            userData.diamond = userData.diamond + framesTotalMine[7] * 2.8;
          }
          const userData = {
            ...userData,
            diamond: userData.diamond,
          };

          convertToShortForm(amount_per_coin);

          setUser(userData);
          socketRef.current.emit("user", {
            User: userData,
            winCoin: amount_per_coin,
          });
        }
      }
    } else if (time <= 1 && time >= -15) {
      setIsVisibleTimer(1);
      setTimerText("Start in " + (16 + time) + "s");
    }
  };

  const convertToShortForm = (number) => {
    if (number >= 1000) {
      const suffixes = ["", "k", "M", "B", "T"];
      const magnitude = Math.floor(Math.log10(number) / 3);
      const shortNumber = (number / Math.pow(1000, magnitude)).toFixed(0);
      setWinCoin(shortNumber + suffixes[magnitude]);
    }

    setWinCoin(number?.toString());
  };
  const getAmount = (coin) => {
    let amount = 0;
    if (coin == safeGameCoin[0]) amount = safeGameCoin[0];
    else if (coin == safeGameCoin[1]) amount = safeGameCoin[1];
    else if (coin == safeGameCoin[2]) amount = safeGameCoin[2];
    else if (coin == safeGameCoin[3]) amount = safeGameCoin[3];
    else if (coin == safeGameCoin[4]) amount = safeGameCoin[4];

    return amount;
  };

  useEffect(() => {
    if (clockTime === -12) {
      totalMineBetCoin = 0;
      totalBetCoin = 0;
      winningFrames = [];
      mineTotalWin = 0;
      winTotal = [];
      arrCoins = [[], [], [], [], [], [], [], []];
      mineCoin = [[], [], [], [], [], [], [], []];
      framesTotalMine = [0, 0, 0, 0, 0, 0, 0, 0];
      framesTotalCoins = [0, 0, 0, 0, 0, 0, 0, 0];
    }
    if (clockTime === -11) {
      setIsOpen(false);
    }
  }, [clockTime]);

  useEffect(() => {
    if (clockTime === -9) {
    }
  }, [clockTime]);

  const convertCoin = (fram, amount) => {
    let totalWinner;
    switch (fram) {
      case 1:
        totalWinner = amount * 36;
        break;
      case 2:
        totalWinner = amount * 3;
        break;
      case 3:
        totalWinner = amount * 3;
        break;
      case 4:
        totalWinner = amount * 3;
        break;
      case 5:
        totalWinner = amount * 2;
        break;
      case 6:
        totalWinner = amount * 2;
        break;
      case 7:
        totalWinner = amount * 2;
        break;
      case 8:
        totalWinner = amount * 2;
        break;
      default:
        break;
    }
    return totalWinner;
  };

  useEffect(() => {
    if (clockTime === -7) {
      const selectedFrames = currentGame?.cardBitCoin
        ?.filter((item) => item?.winner === true)
        ?.map((item) => item?.selectFrame);
      const totalWinCoinSum = winTotal
        .filter((item) => selectedFrames?.includes(item?.fram))
        .reduce((sum, item) => sum + item?.totalWinCoin, 0);
      mineTotalWin = totalWinCoinSum;
      setIsOpen(true);
      socketRef?.current?.emit("user", {
        User: userData,
        winCoin: mineTotalWin,
      });
    }
  }, [clockTime, currentGame, winTotal]);

  const addBit = (bitcoin, myframe) => {
    let amount = getAmount(bitcoin);
    playSoundFunction();
    if (bitcoin != -1 && myframe !== 0) {
      if (userData?.diamond - amount >= 0) {
        userData.diamond -= amount;
        socketRef?.current?.emit("bit", {
          User: userData,
          Bit: bitcoin,
          diamond: amount,
          SelectedFrame: myframe,
          position: {
            left: Math.random() * 55 + 5,
            top: Math.random() * 45 + 0,
          },
        });
        const totalWinCoin = convertCoin(myframe, bitcoin);
        const bitData = {
          bit: bitcoin,
          amount: amount,
          fram: myframe,
          totalWinCoin: totalWinCoin,
        };
        winTotal?.push(bitData);

        mineCoin = mineCoin?.map((arr, index) => {
          if (index + 1 === myframe) {
            // Add the coin data to the current frame
            arr?.push({
              coin: bitcoin,
              left: Math.random() * 55 + 5,
              top: Math.random() * 45 + 0,
            });
            framesTotalCoins[index] += getAmount(bitcoin);
            framesTotalMine[index] += getAmount(bitcoin);
          }
          return arr;
        });

        const initialValue = 0;
        const totalBetCoinGet = framesTotalCoins?.reduce(
          (accumulator, currentValue) => accumulator + currentValue,
          initialValue
        );
        totalBetCoin = totalBetCoinGet;

        const initialValueMine = 0;
        const totalMintBet = framesTotalMine?.reduce(
          (accumulator, currentValue) => accumulator + currentValue,
          initialValueMine
        );
        totalMineBetCoin = totalMintBet;
      } else {
        ToastConent("You don't have enough coins now, please recharge first!");
      }
    } else {
      ToastConent("Missing to select any Coin");
    }
  };

  const currentGameFucntion = (obj) => {
    currentGame = obj;
    if (obj) {
      const userFilterData = obj?.UsersBits?.filter(
        (userFind) => userFind?.UserId === userIdFine
      );

      userFilterData?.forEach((userBit, index) => {
        const { Bit, SelectedFrame } = userBit;

        if (SelectedFrame >= 1 && SelectedFrame <= 8) {
          arrCoins[SelectedFrame - 1] = arrCoins[SelectedFrame - 1] || [];

          arrCoins[SelectedFrame - 1].push({
            coin: Bit,
            left: obj?.position?.left,
            top: obj?.position?.top,
          });
          calculateTotalCoins();
          calculateTotalMines();
        }
      });

      const userOtherFilterData = obj?.UsersBits?.filter(
        (userFind) => userFind?.UserId !== userIdFine
      );
      userOtherFilterData?.forEach((userBit, index) => {
        const { Bit, SelectedFrame } = userBit;

        if (SelectedFrame >= 1 && SelectedFrame <= 8) {
          mineCoin[SelectedFrame - 1] = mineCoin[SelectedFrame - 1] || [];

          mineCoin[SelectedFrame - 1].push({
            coin: Bit,
            left: obj?.position?.left,
            top: obj?.position?.top,
          });
          calculateTotalCoins();
          calculateTotalMines();
        }
      });
    }
  };

  const calculateTotalCoins = () => {
    let amount1 = 0;
    let amount2 = 0;
    let amount3 = 0;
    let amount4 = 0;
    let amount5 = 0;
    let amount6 = 0;
    let amount7 = 0;
    let amount8 = 0;
    if (currentGame?.UsersBits !== undefined) {
      currentGame?.UsersBits?.map((userBit) => {
        if (userBit.SelectedFrame == 1) {
          amount1 += getAmount(userBit.Bit);
        } else if (userBit.SelectedFrame == 2) {
          amount2 += getAmount(userBit.Bit);
        } else if (userBit.SelectedFrame == 3) {
          amount3 += getAmount(userBit.Bit);
        } else if (userBit.SelectedFrame == 4) {
          amount4 += getAmount(userBit.Bit);
        } else if (userBit.SelectedFrame == 5) {
          amount5 += getAmount(userBit.Bit);
        } else if (userBit.SelectedFrame == 6) {
          amount6 += getAmount(userBit.Bit);
        } else if (userBit.SelectedFrame == 7) {
          amount7 += getAmount(userBit.Bit);
        } else if (userBit.SelectedFrame == 8) {
          amount8 += getAmount(userBit.Bit);
        }
      });
    }
    framesTotalCoins = [
      amount1,
      amount2,
      amount3,
      amount4,
      amount5,
      amount6,
      amount7,
      amount8,
    ];

    const initialValue = 0;
    const totalBetCoinGet = framesTotalCoins?.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      initialValue
    );
    totalBetCoin = totalBetCoinGet;
  };

  const calculateTotalMines = () => {
    let amount1 = 0;
    let amount2 = 0;
    let amount3 = 0;
    let amount4 = 0;
    let amount5 = 0;
    let amount6 = 0;
    let amount7 = 0;
    let amount8 = 0;
    const queryParams = new URLSearchParams(window.location.search);
    const userId = queryParams.get("id") || "6579c2980cb6184131234567";
    if (currentGame?.UsersBits !== undefined) {
      currentGame?.UsersBits?.map((userBit) => {
        if (userBit?.UserId === userId) {
          if (userBit.SelectedFrame == 1) {
            amount1 += getAmount(userBit.Bit);
          } else if (userBit.SelectedFrame == 2) {
            amount2 += getAmount(userBit.Bit);
          } else if (userBit.SelectedFrame == 3) {
            amount3 += getAmount(userBit.Bit);
          } else if (userBit.SelectedFrame == 4) {
            amount4 += getAmount(userBit.Bit);
          } else if (userBit.SelectedFrame == 5) {
            amount5 += getAmount(userBit.Bit);
          } else if (userBit.SelectedFrame == 6) {
            amount6 += getAmount(userBit.Bit);
          } else if (userBit.SelectedFrame == 7) {
            amount7 += getAmount(userBit.Bit);
          } else if (userBit.SelectedFrame == 8) {
            amount8 += getAmount(userBit.Bit);
          }
        }
      });
    }
    framesTotalMine = [
      amount1,
      amount2,
      amount3,
      amount4,
      amount5,
      amount6,
      amount7,
      amount8,
    ];

    const initialValue = 0;
    const totalMintBet = framesTotalMine?.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      initialValue
    );
    totalMineBetCoin = totalMintBet;
  };

  const updateGame = (obj) => {
    if (userIdFine !== obj?.UserId) {
      arrCoins = arrCoins?.map((arr, index) => {
        if (index + 1 === obj?.SelectedFrame) {
          arr?.push({
            coin: obj?.Bit,
            left: obj?.position?.left,
            top: obj?.position?.top,
          });
          framesTotalCoins[index] += getAmount(obj?.Bit);
        }
        return arr;
      });
    }

    const initialValue = 0;
    const totalBetCoinGet = framesTotalCoins?.reduce(
      (accumulator, currentValue) => accumulator + currentValue,
      initialValue
    );
    totalBetCoin = totalBetCoinGet;
  };

  const getWinningFrames = (data) => {
    const winningFrames = data
      ?.filter((item) => item?.winner)
      ?.map((item) => item?.selectFrame);

    return winningFrames;
  };

  const clickedCoin2K = (e) => {
    selectedCoin = safeGameCoin[0];
  };
  const clickedCoin5K = (e) => {
    selectedCoin = safeGameCoin[1];
  };
  const clickedCoin10K = (e) => {
    selectedCoin = safeGameCoin[2];
  };
  const clickedCoin20K = (e) => {
    selectedCoin = safeGameCoin[3];
  };
  const clickedCoin50K = (e) => {
    selectedCoin = safeGameCoin[4];
  };

  const clickFrame1 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 1);
    }
  };

  const clickFrame2 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 2);
    }
  };

  const clickFrame3 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 3);
    }
  };

  const clickFrame4 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 4);
    }
  };

  const clickFrame5 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 5);
    }
  };

  const clickFrame6 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 6);
    }
  };

  const clickFrame7 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 7);
    }
  };

  const clickFrame8 = (e) => {
    if (selectedCoin >= 0) {
      addBit(selectedCoin == 0 ? safeGameCoin[0] : selectedCoin, 8);
    }
  };

  return (
    <>
      <div className="table-content">
        <div className="table-data">
          <div className="table-center-data">
            <div className="table-daaaa">
              <div className="table-userButton">
                <div className="row w-100">
                  <div className="col-6">
                    <div className="show-button-top">
                      <div className="helpIcon-button">
                        <button
                          onClick={(event) => {
                            handleOpenModel("rule");
                            event.stopPropagation();
                          }}
                        >
                          <QuestionIcon />
                        </button>
                        <div className="sound-icon-mo">
                          <button onClick={() => handleMuteSound()}>
                            {muteSound ? <SoundMuteIcon /> : <SoundUpIcon />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="user-button">
                      <button>
                        <UsersIcon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row table-head">
                <div className="col-4 col-md-3 d-flex justify-content-start">
                  <div
                    className="table-oldBet"
                    onClick={(event) => {
                      setHistoryOpen(!historyOpen);
                      event.stopPropagation();
                    }}
                  >
                    <h6>New &#62;</h6>
                    <div className="old-bet-showNumber">
                      <div
                        className={`old-bet-boxNumber ${
                          resultNo?.no === "Spin" ? "showNumberSpin" : ""
                        }`}
                        style={{ backgroundColor: `${resultNo?.color}` }}
                      >
                        <span>{resultNo?.no}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-4 col-md-6 d-flex align-items-center justify-content-center">
                  <div className="table-headText">
                    <h6>
                      Total Bet:{" "}
                      <span>
                        {totalBetCoin ? totalBetCoin?.toLocaleString() : 0}
                      </span>
                    </h6>
                    <h6>
                      My Bet:{" "}
                      <span>
                        {totalMineBetCoin
                          ? totalMineBetCoin?.toLocaleString()
                          : 0}
                      </span>
                    </h6>
                  </div>
                </div>
                <div className="col-4 col-md-3 ">
                  <div className="table-timeWatch">
                    <div className="time-watch">
                      <span>{timerText && timerText}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="table-body">
                <div className="table-box">
                  <Frame
                    totalBet={"5000"}
                    myBet={"400"}
                    multiCoin={"36"}
                    betDetails={"0"}
                    coins={framesTotalCoins[0]}
                    mine={framesTotalMine[0]}
                    arrCoins={arrCoins[0]}
                    mineCoin={mineCoin[0]}
                    gameCoin={safeGameCoin}
                    framNo={1}
                    winningFrames={winningFrames}
                    onClick={clickFrame1}
                  />
                  <Frame
                    totalBet={"6000"}
                    myBet={"600"}
                    multiCoin={"3"}
                    betDetails={"1-12"}
                    coins={framesTotalCoins[1]}
                    mine={framesTotalMine[1]}
                    arrCoins={arrCoins[1]}
                    mineCoin={mineCoin[1]}
                    gameCoin={safeGameCoin}
                    framNo={2}
                    winningFrames={winningFrames}
                    onClick={clickFrame2}
                  />
                  <Frame
                    totalBet={"5000"}
                    myBet={"0"}
                    multiCoin={"3"}
                    betDetails={"13-24"}
                    coins={framesTotalCoins[2]}
                    mine={framesTotalMine[2]}
                    gameCoin={safeGameCoin}
                    arrCoins={arrCoins[2]}
                    mineCoin={mineCoin[2]}
                    framNo={3}
                    winningFrames={winningFrames}
                    onClick={clickFrame3}
                  />
                  <Frame
                    totalBet={"4000"}
                    myBet={"0"}
                    multiCoin={"3"}
                    betDetails={"25-36"}
                    coins={framesTotalCoins[3]}
                    mine={framesTotalMine[3]}
                    arrCoins={arrCoins[3]}
                    mineCoin={mineCoin[3]}
                    gameCoin={safeGameCoin}
                    framNo={4}
                    winningFrames={winningFrames}
                    onClick={clickFrame4}
                  />
                  <Frame
                    totalBet={"5000"}
                    myBet={"0"}
                    multiCoin={"2"}
                    betDetails={"Red"}
                    coins={framesTotalCoins[4]}
                    mine={framesTotalMine[4]}
                    arrCoins={arrCoins[4]}
                    mineCoin={mineCoin[4]}
                    gameCoin={safeGameCoin}
                    framNo={5}
                    winningFrames={winningFrames}
                    onClick={clickFrame5}
                  />
                  <Frame
                    totalBet={"5000"}
                    myBet={"0"}
                    multiCoin={"2"}
                    betDetails={"Black"}
                    coins={framesTotalCoins[5]}
                    mine={framesTotalMine[5]}
                    arrCoins={arrCoins[5]}
                    mineCoin={mineCoin[5]}
                    gameCoin={safeGameCoin}
                    framNo={6}
                    winningFrames={winningFrames}
                    onClick={clickFrame6}
                  />
                  <Frame
                    totalBet={"5000"}
                    myBet={"0"}
                    multiCoin={"2"}
                    betDetails={"Odd"}
                    coins={framesTotalCoins[6]}
                    mine={framesTotalMine[6]}
                    arrCoins={arrCoins[6]}
                    mineCoin={mineCoin[6]}
                    gameCoin={safeGameCoin}
                    framNo={7}
                    winningFrames={winningFrames}
                    onClick={clickFrame7}
                  />
                  <Frame
                    totalBet={"6000"}
                    myBet={"200"}
                    multiCoin={"2"}
                    betDetails={"Even"}
                    coins={framesTotalCoins[7]}
                    mine={framesTotalMine[7]}
                    arrCoins={arrCoins[7]}
                    mineCoin={mineCoin[7]}
                    gameCoin={safeGameCoin}
                    framNo={8}
                    winningFrames={winningFrames}
                    onClick={clickFrame8}
                  />
                </div>
              </div>
            </div>
            <div className="table-footer  ">
              <div className="dimond-coin">
                <img src={DiamondIcon} />
                <span>
                  {userData?.diamond
                    ? userData?.diamond?.toLocaleString()
                    : "0"}
                </span>
              </div>
              <div className="coin-button-box">
                <CoinBtn
                  src={coin2k}
                  number={safeGameCoin[0]}
                  funcClick={clickedCoin2K}
                  selectedClass={
                    selectedCoin == safeGameCoin[0] ? "selectedCoin" : ""
                  }
                  disabledClass={canPressCoins === false ? "coinDisabled" : ""}
                />
                <CoinBtn
                  src={coin5k}
                  number={safeGameCoin[1]}
                  funcClick={clickedCoin5K}
                  selectedClass={
                    selectedCoin == safeGameCoin[1] ? "selectedCoin" : ""
                  }
                  disabledClass={canPressCoins === false ? "coinDisabled" : ""}
                />
                <CoinBtn
                  src={coin10k}
                  number={safeGameCoin[2]}
                  funcClick={clickedCoin10K}
                  selectedClass={
                    selectedCoin == safeGameCoin[2] ? "selectedCoin" : ""
                  }
                  disabledClass={canPressCoins === false ? "coinDisabled" : ""}
                />
                <CoinBtn
                  src={coin20k}
                  number={safeGameCoin[3]}
                  funcClick={clickedCoin20K}
                  selectedClass={
                    selectedCoin == safeGameCoin[3] ? "selectedCoin" : ""
                  }
                  disabledClass={canPressCoins === false ? "coinDisabled" : ""}
                />
                <CoinBtn
                  number={safeGameCoin[4]}
                  src={coin50k}
                  funcClick={clickedCoin50K}
                  selectedClass={
                    selectedCoin == safeGameCoin[4] ? "selectedCoin" : ""
                  }
                  disabledClass={canPressCoins === false ? "coinDisabled" : ""}
                />
              </div>
              <div className="history-icon">
                <button
                  onClick={(event) => {
                    handleOpenModel("history");
                    event.stopPropagation();
                  }}
                >
                  <i class="fas fa-history"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <BetHistoryModel
        open={historyOpen}
        setOpen={setHistoryOpen}
        historyData={historyData}
      />
      <WinnerModel
        open={isOpen}
        mineTotalWin={mineTotalWin}
        resultShow={resultNo}
        setIsOpen={setIsOpen}
      />
    </>
  );
}
