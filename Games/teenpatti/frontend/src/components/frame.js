import "../style/frame.css";
import Coin from "./coin";
import Card from "./card";

import clubA from "../images/cards/ace_of_clubs.png";
import club2 from "../images/cards/2_of_clubs.png";
import club3 from "../images/cards/3_of_clubs.png";
import club4 from "../images/cards/4_of_clubs.png";
import club5 from "../images/cards/5_of_clubs.png";
import club6 from "../images/cards/6_of_clubs.png";
import club7 from "../images/cards/7_of_clubs.png";
import club8 from "../images/cards/8_of_clubs.png";
import club9 from "../images/cards/9_of_clubs.png";
import club10 from "../images/cards/10_of_clubs.png";
import clubJ from "../images/cards/jack_of_clubs2.png";
import clubQ from "../images/cards/queen_of_clubs2.png";
import clubK from "../images/cards/king_of_clubs2.png";

import heartA from "../images/cards/ace_of_hearts.png";
import heart2 from "../images/cards/2_of_hearts.png";
import heart3 from "../images/cards/3_of_hearts.png";
import heart4 from "../images/cards/4_of_hearts.png";
import heart5 from "../images/cards/5_of_hearts.png";
import heart6 from "../images/cards/6_of_hearts.png";
import heart7 from "../images/cards/7_of_hearts.png";
import heart8 from "../images/cards/8_of_hearts.png";
import heart9 from "../images/cards/9_of_hearts.png";
import heart10 from "../images/cards/10_of_hearts.png";
import heartJ from "../images/cards/jack_of_hearts2.png";
import heartQ from "../images/cards/queen_of_hearts2.png";
import heartK from "../images/cards/king_of_hearts2.png";

import dimondA from "../images/cards/ace_of_diamonds.png";
import dimond2 from "../images/cards/2_of_diamonds.png";
import dimond3 from "../images/cards/3_of_diamonds.png";
import dimond4 from "../images/cards/4_of_diamonds.png";
import dimond5 from "../images/cards/5_of_diamonds.png";
import dimond6 from "../images/cards/6_of_diamonds.png";
import dimond7 from "../images/cards/7_of_diamonds.png";
import dimond8 from "../images/cards/8_of_diamonds.png";
import dimond9 from "../images/cards/9_of_diamonds.png";
import dimond10 from "../images/cards/10_of_diamonds.png";
import dimondJ from "../images/cards/jack_of_diamonds2.png";
import dimondQ from "../images/cards/queen_of_diamonds2.png";
import dimondK from "../images/cards/king_of_diamonds2.png";



import spadesA from "../images/cards/ace_of_spades.png";
import spades2 from "../images/cards/2_of_spades.png";
import spades3 from "../images/cards/3_of_spades.png";
import spades4 from "../images/cards/4_of_spades.png";
import spades5 from "../images/cards/5_of_spades.png";
import spades6 from "../images/cards/6_of_spades.png";
import spades7 from "../images/cards/7_of_spades.png";
import spades8 from "../images/cards/8_of_spades.png";
import spades9 from "../images/cards/9_of_spades.png";
import spades10 from "../images/cards/10_of_spades.png";
import spadesJ from "../images/cards/jack_of_spades2.png";
import spadesQ from "../images/cards/queen_of_spades2.png";
import spadesK from "../images/cards/king_of_spades2.png";

import back from "../images/cards/back.png";

import ribbonImage from "../images/Ribbon.png";
import starRibbonImage from "../images/Ribbon+Stars.png";

import coin2k from "../images/2K.png";
import coin5k from "../images/5K.png";
import coin10k from "../images/10K.png";
import coin20k from "../images/20K.png";
import coin50k from "../images/50K.png";

function Frame({
  coins,
  mine,
  src,
  card1,
  card2,
  card3,
  isVisibleRibbon,
  ribbonIdx,
  ribbonText,
  arrCoins,
  onClick,
  disabledClass,
  canCardShow,
  gameCoin,
}) {
  let cardImages = [
    back,  // card backside 
    clubA,
    club2,
    club3,
    club4,
    club5,
    club6,
    club7,
    club8,
    club9,
    club10,
    clubJ,
    clubQ,
    clubK,
    
    heartA, 
    heart2,
    heart3,
    heart4,
    heart5,
    heart6,
    heart7,
    heart8,
    heart9,
    heart10,
    heartJ,
    heartQ,
    heartK,

    dimondA, 
    dimond2,
    dimond3,
    dimond4,
    dimond5,
    dimond6,
    dimond7,
    dimond8,
    dimond9,
    dimond10,
    dimondJ,
    dimondQ,
    dimondK,

    spadesA,
    spades2,
    spades3,
    spades4,
    spades5,
    spades6,
    spades7,
    spades8,
    spades9,
    spades10,
    spadesJ,
    spadesQ,
    spadesK,
  ];

  let coinImages = [coin2k, coin5k, coin10k, coin20k, coin50k];
  let ribbons = [starRibbonImage, starRibbonImage];


 

  const coinsRender = arrCoins.map(
    (obj, i) => (
    (
        <Coin
          key={i}
          name={
            obj.coin == gameCoin[0]
              ? gameCoin[0]
              : obj.coin == gameCoin[1]
              ? gameCoin[1]
              : obj.coin == gameCoin[2]
              ? gameCoin[2]
              : obj.coin == gameCoin[3]
              ? gameCoin[3]
              : obj.coin == gameCoin[4] && gameCoin[4]
          }
      
          src={
            obj.coin == gameCoin[0]
              ? coinImages[0]
              : obj.coin == gameCoin[1]
              ? coinImages[1]
              : obj.coin == gameCoin[2]
              ? coinImages[2]
              : obj.coin == gameCoin[3]
              ? coinImages[3]
              : obj.coin == gameCoin[4] && coinImages[4]
          }
          left={obj.left + "%"}
          top={obj.top + "%"}
        />
      )
    )
  );

  let amount = 0;
  const getRenderAmount = (amo) => {
    const decimalAmo = amo;
    amount = amount + decimalAmo;

    return decimalAmo;
  };

  return (
    <div className="col frame " style={{ backgroundImage: `url('${src}')` ,backgroundSize: `${isVisibleRibbon === 1 ?  "43vw 100%" : "85% 100%"}`}}>
      {/* {canCardShow == true && ( */}
      <div>
        <div className="row cards">
          <Card src={cardImages[card1]} />
          <Card src={cardImages[card2]} />
          <Card src={cardImages[card3]} />
        </div>
        <p className="ribbonText">{ribbonText}</p>
        <div className="sumCoins">Total: {getRenderAmount(coins)}</div>
        <div className="coins"> {coinsRender}</div>

        <div className="mine">Mine: {getRenderAmount(mine)}</div>
        {/* <div
            className={ribbonIdx == 1 ? "starRibbon" : "ribbon"}
            style={{
              display: isVisibleRibbon ? "block" : "none",
              backgroundImage: `url('${ribbons[ribbonIdx]}')`,
            }
          }
           
          > */}
        {/* <p className="ribbonText">{ribbonText}</p> */}

        {/* </div> */}
        <button
          className={"frameBtn " + disabledClass}
          onClick={onClick}
        ></button>
      </div>
      {/* )} */}
    </div>
  );
}

export default Frame;
