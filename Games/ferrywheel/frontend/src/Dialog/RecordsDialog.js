import React from "react";
import CoinIcon from "../assets/image/coin.png";
import { imageShowData } from "../GiftImage";

function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const date = d.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
    return `${date} ${time}`;
  } catch (e) {
    return dateString;
  }
}

export default function RecordsDialog(props) {
  const { open, setOpen, historyRecord } = props;

  if (!open) return null;

  const records = Array.isArray(historyRecord) ? historyRecord : [];

  return (
    <div className="custom-dialog-overlay" onClick={() => setOpen(false)}>
      <div className="custom-dialog-card records-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          className="dialog-close-btn"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="#ffd54f"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="custom-dialog-header">
          <div className="dialog-badge-pill">
            <span>MY BET HISTORY</span>
          </div>
          <h3 className="dialog-title">Guess Records</h3>
          <span className="dialog-sub">Showing your last 100 bets</span>
        </div>

        {/* Content */}
        <div className="custom-dialog-body records-body">
          {records.length > 0 ? (
            <div className="records-table-wrapper">
              <table className="custom-records-table">
                <thead>
                  <tr>
                    <th>Bet</th>
                    <th>Picked</th>
                    <th>Result</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((item, idx) => {
                    const isWin = item?.isWinner === true;
                    return (
                      <tr key={idx} className={isWin ? "row-win" : "row-loss"}>
                        <td>
                          <div className="bet-coin-cell">
                            <img src={CoinIcon} alt="coin" className="record-coin-icon" />
                            <span>{item?.Bit?.toLocaleString() || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div className="item-icon-cell">
                            <img
                              src={imageShowData[item?.selectedFrame - 1] || imageShowData[0]}
                              alt="picked"
                            />
                          </div>
                        </td>
                        <td>
                          <div className="item-icon-cell">
                            <img
                              src={imageShowData[item?.winnerNumber - 1] || imageShowData[0]}
                              alt="winner"
                            />
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${isWin ? "pill-win" : "pill-loss"}`}>
                            {isWin ? `Win ${item?.winnerNumberTimes || 5}X` : "Loss"}
                          </span>
                        </td>
                        <td>
                          <span className="record-time">{formatDate(item?.createdAt)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-records-box">
              <div className="empty-icon">🎲</div>
              <h5>No Guess Records Yet</h5>
              <p>Place your bets on Bob's Choice wheel and your history will show up here!</p>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="custom-dialog-footer">
          <button className="dialog-confirm-btn" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
