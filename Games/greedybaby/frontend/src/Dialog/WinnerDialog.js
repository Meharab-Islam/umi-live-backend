import React, { useEffect, useState } from "react";
import { imageShowData } from "../GiftImage";

export default function WinnerDialog(props) {
  const { open, setOpen, winnerShow, userData, gameRound, currentGame } = props;
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (open && !event.target.closest(".winner-dialog")) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [open, setOpen]);

  useEffect(() => {
    // Calculate Current Earnings
    const findWinnerUser = winnerShow?.winnerUserArray?.find(
      (user) => user?._id === userData?._id
    );
    setCurrentEarnings(findWinnerUser?.userWinCoin || 0);

    // Calculate Current Bet
    let myTotalBet = 0;
    if (currentGame && Array.isArray(currentGame)) {
      const myBets = currentGame.filter(item => item?.userId === userData?._id);
      myBets.forEach(bet => {
        myTotalBet += bet.Bit || 0;
      });
    }
    setCurrentBet(myTotalBet);

  }, [userData, winnerShow, currentGame]);

  if (!open) return null;

  return (
    <div className="winner-dialog">
      <div className="dialog-content">
        <div className="result-container">
          <div className="winning-item-container">
            {winnerShow?.winnerNumber && (
              <img
                src={imageShowData[winnerShow?.winnerNumber - 1]}
                alt="Winner"
                className="winning-item-img"
              />
            )}
          </div>
          <div className="result-text-info">
            <h6 className="round-text">Round {gameRound} Result:</h6>
            <div className="stats-row">
              <span>Current Earnings:</span>
              <div className="coin-val">
                <span>{currentEarnings}</span>
              </div>
            </div>
            <div className="stats-row">
              <span>Current Bet:</span>
              <div className="coin-val">
                <span>{currentBet}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
