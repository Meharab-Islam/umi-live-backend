import React, { useEffect, useRef, useState } from "react";
import coin2k from "../assets/2K.png";
import coin5k from "../assets/5K.png";
import coin10k from "../assets/10K.png";
import coin20k from "../assets/20K.png";
import coin50k from "../assets/50K.png";
import CoinButtonShow from "./CoinButtonShow";

export default function Frame({
  arrCoins,
  totalBet,
  myBet,
  betDetails,
  mineCoin,
  multiCoin,
  gameCoin,
  onClick,
  winningFrames,
  framNo,
  coins,
  mine,
}) {
  const defaultCoins = [100, 200, 300, 400, 500];
  const safeCoins = (Array.isArray(gameCoin) && gameCoin.length >= 5) ? gameCoin : defaultCoins;
  let coinImages = [coin2k, coin5k, coin10k, coin20k, coin50k];
  const coinsRender = arrCoins?.map((obj, i) => {
    return (
      <CoinButtonShow
        key={i}
        name={
          obj.coin == safeCoins[0]
            ? safeCoins[0]
            : obj.coin == safeCoins[1]
            ? safeCoins[1]
            : obj.coin == safeCoins[2]
            ? safeCoins[2]
            : obj.coin == safeCoins[3]
            ? safeCoins[3]
            : obj.coin == safeCoins[4] && safeCoins[4]
        }
        src={
          obj.coin == safeCoins[0]
            ? coinImages[0]
            : obj.coin == safeCoins[1]
            ? coinImages[1]
            : obj.coin == safeCoins[2]
            ? coinImages[2]
            : obj.coin == safeCoins[3]
            ? coinImages[3]
            : obj.coin == safeCoins[4] && coinImages[4]
        }
        left={obj.left + "%"}
        top={obj.top + "%"}
      />
    );
  });
  const mineCoinRener = mineCoin?.map((obj, i) => {
    return (
      <CoinButtonShow
        key={i}
        mineCoin={true}
        name={
          obj.coin == safeCoins[0]
            ? safeCoins[0]
            : obj.coin == safeCoins[1]
            ? safeCoins[1]
            : obj.coin == safeCoins[2]
            ? safeCoins[2]
            : obj.coin == safeCoins[3]
            ? safeCoins[3]
            : obj.coin == safeCoins[4] && safeCoins[4]
        }
        src={
          obj.coin == safeCoins[0]
            ? coinImages[0]
            : obj.coin == safeCoins[1]
            ? coinImages[1]
            : obj.coin == safeCoins[2]
            ? coinImages[2]
            : obj.coin == safeCoins[3]
            ? coinImages[3]
            : obj.coin == safeCoins[4] && coinImages[4]
        }
        left={obj.left + "%"}
        top={obj.top + "%"}
      />
    );
  });

  return (
    <div className="bet-details">
      <div
        className={`bet-box ${
          winningFrames?.includes(framNo) ? "fram-light" : ""
        }`}
        onClick={onClick}
      >
        <div className="bet-top">
          <h6>
            {mine}/<span>{coins}</span>
          </h6>
        </div>
        <div className="bet-number">
          {/* {renderedCoins} */}
          {coinsRender}
          {mineCoinRener}
          <h4>{betDetails}</h4>
          <h5>
            &#9747;<span>{multiCoin}</span>
          </h5>
        </div>
      </div>
    </div>
  );
}
