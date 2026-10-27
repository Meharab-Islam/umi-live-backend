import React from "react";
import CoinIcon from "../assets/image/coin.png";

export default function SelectCricle(props) {
  const {
    image,
    cricleMainStyle,
    onClick,
    framNo,
    selectFrame,
    multiplier,
    badgeColor = "purple",
    ringColor = "blue",
    isCurrentRoll = false,
    isWinner = false,
  } = props;

  const hasBet = selectFrame?.Bit > 0;

  return (
    <div
      className={`cricle-pod pod-${framNo} pod-ring-${ringColor} ${
        isCurrentRoll ? "pod-active-roll" : ""
      } ${isWinner ? "pod-winner-pulse" : ""}`}
      style={cricleMainStyle}
      onClick={onClick}
    >
      <div className="pod-inner-circle">
        <img src={image} alt={`pod-item-${framNo}`} className="pod-item-img" />
      </div>

      {/* Multiplier Badge */}
      <div className={`pod-multiplier-badge badge-${badgeColor}`}>
        <span>{multiplier}</span>
      </div>

      {/* Bet Amount on this item */}
      {hasBet && (
        <div className="pod-bet-badge">
          <img src={CoinIcon} alt="coin" />
          <span>
            {selectFrame.Bit >= 1000
              ? (selectFrame.Bit / 1000).toFixed(0) + "k"
              : selectFrame.Bit}
          </span>
        </div>
      )}

      {/* Wheel spin rolling highlight */}
      <div className="pod-roll-glow"></div>
      <div className="winnerFram"></div>
    </div>
  );
}

