import React from "react";
import DimondIcon from "../assets/image/dimondIcon.png";
import Coin100 from "../assets/image/100.png";
import CoinBig from "../assets/image/big.png";

function convertToShortForm(number) {
  if (number >= 1000) {
    const suffixes = ["", "k", "M", "B", "T"];
    const magnitude = Math.floor(Math.log10(number) / 3);
    const shortNumber = (number / Math.pow(1000, magnitude)).toFixed(0);
    return shortNumber + suffixes[magnitude];
  }
  return number?.toString();
}

export default function CoinButton(props) {
  const { funcClick, selectedClass, disabledClass, number } = props;

  const shortForm = convertToShortForm(number);

  const bgImage = selectedClass && selectedClass.includes("selectedCoin") ? Coin100 : CoinBig;

  return (
    <button
      className={`${disabledClass + ""} ${selectedClass} dimond-box`}
      style={{
        color: "#ffff",
        fontWeight: "700",
        border: "none",
        backgroundColor: "transparent",
        position: "relative",
      }}
      onClick={funcClick}
    >
      <img
        src={bgImage}
        alt="coin-bg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      />
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
        height: "100%",
        paddingBottom: "18px",
        zIndex: 1,
      }}>
        <h6 style={{ margin: 0, color: '#fff', fontSize: '13px', fontStyle: 'italic', fontWeight: 'bold' }}>{shortForm}</h6>
      </div>
    </button>
  );
}
