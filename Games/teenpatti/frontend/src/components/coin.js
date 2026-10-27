import "../style/coin.css";


function convertToShortForm(number) {
  if (number >= 1000) {
    const suffixes = ["", "k", "M", "B", "T"];
    const magnitude = Math.floor(Math.log10(number) / 3);
    const shortNumber = (number / Math.pow(1000, magnitude)).toFixed(0);
    return shortNumber + suffixes[magnitude];
  }
  return number?.toString();
}
function Coin({ src, left, top, name }) {
  const shortForm = convertToShortForm(name); 
  let topCoin = parseFloat(top) + 9;
  let leftCoin = parseFloat(left) +8;
  return (
    // <div className="coin" style={{ backgroundImage: `url('${src}')`,left: left,top:top   }} >{name}</div>
    <>
<div>
  <div className="coin" style={{ backgroundImage: `url('${src}')`,left: left,top:top   }}>

  </div>
  <span className="cardShowCoin_" style={{
              position: "absolute",
              left: `${leftCoin}%`,
              top: `${topCoin}%`,
            }}>{shortForm}</span>
</div>

    </>
    
  );
}

export default Coin;
