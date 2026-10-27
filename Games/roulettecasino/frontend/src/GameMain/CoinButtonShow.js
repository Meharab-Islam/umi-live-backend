function convertToShortForm(number) {
  if (number >= 1000) {
    const suffixes = ["", "k", "M", "B", "T"];
    const magnitude = Math.floor(Math.log10(number) / 3);
    const shortNumber = (number / Math.pow(1000, magnitude)).toFixed(0);
    return shortNumber + suffixes[magnitude];
  }
  return number?.toString();
}
function CoinButtonShow({ src, left, top, name ,mineCoin}) {
  const shortForm = convertToShortForm(name);
  let topCoin = parseFloat(top) + 16;
  let leftCoin = parseFloat(left) + 10;
  return (
    // <div className="coin" style={{ backgroundImage: `url('${src}')`,left: left,top:top   }} >{name}</div>
    <>
      <div className={`${mineCoin ? "coinBoxMine":"coinBox"}`}>
        <div
          className="coinShow"
          style={{ backgroundImage: `url('${src}')`, left: left, top: top }}
        >
        <span
          className="cardShowCoin_"
          style={{
            position: "absolute",
          }}
        >
          {shortForm}
        </span>
        </div>
      </div>
    </>
  );
}

export default CoinButtonShow;
