import React, { useEffect, useState } from "react";
import CoinIcon from "../assets/image/coin.png";
import TrophyIcon from "../assets/image/trophy.png";
import CrownIcon from "../assets/image/crown.png";
import Winner1 from "../assets/image/winner1.png";
import Winner2 from "../assets/image/winner2.png";
import Winner3 from "../assets/image/winner3.png";
import { imageShowData } from "../GiftImage";

const ITEM_DETAILS = [
  { name: "Tomato", mult: "5X", color: "#ffb300" },
  { name: "Carrot", mult: "5X", color: "#29b6f6" },
  { name: "Balloons", mult: "10X", color: "#ec407a" },
  { name: "Unicorn", mult: "15X", color: "#ab47bc" },
  { name: "Tricycle", mult: "25X", color: "#ffa726" },
  { name: "Blue Car", mult: "45X", color: "#26c6da" },
  { name: "Roast Ham", mult: "5X", color: "#5c6bc0" },
  { name: "Hotdog", mult: "5X", color: "#42a5f5" },
];

export default function WinnerDialog(props) {
  const { open, setOpen, winnerShow, userData, gameRound, currentGame } = props;
  const [userWinData, setUserWinData] = useState(null);
  const [hasBet, setHasBet] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (open && !event.target.closest(".winner-dialog-card")) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open, setOpen]);

  useEffect(() => {
    const myWin = winnerShow?.winnerUserArray?.find(
      (u) => u?._id === userData?._id
    );
    setUserWinData(myWin);

    const userDidBet = currentGame?.some(
      (item) => item?.userId === userData?._id
    );
    setHasBet(userDidBet);
  }, [userData, winnerShow, currentGame]);

  if (!open) return null;

  const winnerNum = winnerShow?.winnerNumber;
  const winningItemInfo = winnerNum ? ITEM_DETAILS[winnerNum - 1] : null;
  const winningItemImg = winnerNum ? imageShowData[winnerNum - 1] : null;
  const topWinners = winnerShow?.winnerUserArray || [];
  const didUserWin = Boolean(userWinData && userWinData.userWinCoin > 0);

  return (
    <div className="winner-dialog-overlay">
      <div className="winner-dialog-card">
        {/* Close Button */}
        <button
          className="winner-close-btn"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Top Header Banner */}
        <div className={`winner-dialog-header ${didUserWin ? "header-victory" : "header-standard"}`}>
          <div className="header-badge-pill">
            <span className="round-tag">Round #{gameRound || 1}</span>
          </div>
          <h3 className="winner-header-title">
            {didUserWin ? (
              <>
                <img src={CrownIcon} alt="crown" className="header-crown-icon" />
                <span>BIG WINNER!</span>
                <img src={CrownIcon} alt="crown" className="header-crown-icon" />
              </>
            ) : (
              <span>ROUND RESULT</span>
            )}
          </h3>
        </div>

        {/* Winning Choice Showcase Hub */}
        <div className="winner-showcase-hub">
          <div className="showcase-sunburst"></div>
          <div
            className="showcase-pod-circle"
            style={{
              borderColor: winningItemInfo?.color || "#ffd54f",
              boxShadow: `0 0 20px ${winningItemInfo?.color || "#ffd54f"}, inset 0 2px 6px rgba(255,255,255,0.6)`,
            }}
          >
            {winningItemImg && (
              <img
                src={winningItemImg}
                alt={winningItemInfo?.name || "Winner"}
                className="showcase-item-img"
              />
            )}
          </div>

          <div className="showcase-item-meta">
            <span className="showcase-item-name">
              Bob's Choice: <strong>{winningItemInfo?.name || "Winning Food"}</strong>
            </span>
            <span className="showcase-mult-tag">{winningItemInfo?.mult || "5X"} Multiplier</span>
          </div>
        </div>

        {/* User Win / Loss Status Bar */}
        <div className="user-win-status-section">
          {didUserWin ? (
            <div className="user-win-box victory-glow">
              <span className="win-box-sub">CONGRATULATIONS! YOU WON</span>
              <div className="win-amount-row">
                <img src={CoinIcon} alt="gold coin" className="win-coin-icon" />
                <span className="win-amount-text">
                  +{userWinData?.userWinCoin?.toLocaleString()}
                </span>
              </div>
            </div>
          ) : hasBet ? (
            <div className="user-status-card loss-card">
              <span className="status-main-text">You didn't win this round</span>
              <span className="status-sub-text">Keep going! Luck is just one spin away!</span>
            </div>
          ) : (
            <div className="user-status-card no-bet-card">
              <span className="status-main-text">You didn't place any bet this round</span>
              <span className="status-sub-text">Select your chips and join the next spin!</span>
            </div>
          )}
        </div>

        {/* Winners Leaderboard */}
        <div className="winners-list-section">
          <div className="section-divider-title">
            <span className="divider-line"></span>
            <span className="divider-label">
              <img src={TrophyIcon} alt="trophy" className="divider-trophy-img" />
              <span>ROUND WINNERS</span>
            </span>
            <span className="divider-line"></span>
          </div>

          {topWinners.length > 0 ? (
            <div className="top-winners-row">
              {topWinners.slice(0, 3).map((item, idx) => (
                <div key={idx} className={`winner-player-pod rank-${idx + 1}`}>
                  <div className="player-avatar-wrapper">
                    <img
                      src={
                        item?.image ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${item?.name || idx}`
                      }
                      alt={item?.name || "Player"}
                      className="player-avatar-img"
                    />
                    <div className="rank-wreath-badge">
                      {idx === 0 ? (
                        <img src={Winner1} alt="Rank 1" />
                      ) : idx === 1 ? (
                        <img src={Winner2} alt="Rank 2" />
                      ) : (
                        <img src={Winner3} alt="Rank 3" />
                      )}
                    </div>
                  </div>
                  <span className="player-name">{item?.name || "Player"}</span>
                  <div className="player-payout">
                    <img src={CoinIcon} alt="coin" />
                    <span>+{item?.userWinCoin?.toLocaleString() || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-winners-message">
              <span>No players won this round.</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="winner-dialog-actions">
          <button
            className="continue-game-btn"
            onClick={() => setOpen(false)}
          >
            <span>Play Next Round</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12H19M19 12L12 5M19 12L12 19"
                stroke="#3e2723"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
