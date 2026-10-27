// export default CoinBtn;

import React, { useEffect } from "react";

function convertToShortForm(number) {
  if (number >= 1000) {
    const suffixes = ["", "k", "M", "B", "T"];
    const magnitude = Math.floor(Math.log10(number) / 3);
    const shortNumber = (number / Math.pow(1000, magnitude)).toFixed(0);
    return shortNumber + suffixes[magnitude];
  }
  return number?.toString();
}

function CoinBtn({ src, funcClick, selectedClass, disabledClass, number }) {
  const shortForm = convertToShortForm(number); 

  return (
    <div className=" coinBtn">
      <button
        className={`${disabledClass + ""} ${
          selectedClass 
        } cardShowCoin_`}
        style={{
          backgroundImage: `url('${src}')`,
          color: "#ffff",

          fontWeight: "700",
        }}
        onClick={funcClick}
      >
        {shortForm}
      </button>
    </div>
  );
}

export default CoinBtn;
