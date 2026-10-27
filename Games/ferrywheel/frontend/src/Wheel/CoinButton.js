import React from "react";
import CoinIcon from "../assets/image/coin.png";

function formatNumber(num) {
  if (!num) return "0";
  return num.toString();
}

export default function CoinButton(props) {
  const { funcClick, isSelected, isDisabled, number } = props;

  return (
    <button
      className={`chip-button ${isSelected ? "chip-selected" : "chip-default"} ${
        isDisabled ? "chip-disabled" : ""
      }`}
      onClick={funcClick}
      disabled={isDisabled}
    >
      <img src={CoinIcon} alt="coin" className="chip-coin-icon" />
      <span className="chip-amount">{formatNumber(number)}</span>
    </button>
  );
}

