import React from "react";

export default function RulesDialog(props) {
  const { open, setOpen } = props;

  if (!open) return null;

  return (
    <div className="custom-dialog-overlay" onClick={() => setOpen(false)}>
      <div className="custom-dialog-card rules-card" onClick={(e) => e.stopPropagation()}>
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
            <span>GAMEPLAY GUIDE</span>
          </div>
          <h3 className="dialog-title">Rules of the Game</h3>
        </div>

        {/* Content */}
        <div className="custom-dialog-body">
          <div className="rule-item">
            <div className="rule-num">1</div>
            <div className="rule-text">
              <h6>Select Amount & Items</h6>
              <p>Choose your chip amount (e.g. 10, 100, 1000) and tap any item on Bob's Wheel to place your bet.</p>
            </div>
          </div>

          <div className="rule-item">
            <div className="rule-num">2</div>
            <div className="rule-text">
              <h6>Quick Category Bets</h6>
              <p>Use <strong>All Foods</strong> (🍅 🥕 🌭 🍖) or <strong>All Toys</strong> (🎈 🦄 🚲 🚗) to bet across the entire group in one tap.</p>
            </div>
          </div>

          <div className="rule-item">
            <div className="rule-num">3</div>
            <div className="rule-text">
              <h6>Multipliers & Payouts</h6>
              <p>All Foods award <strong>5X</strong> diamonds. Toys award <strong>10X, 15X, 25X, 45X</strong> diamonds!</p>
            </div>
          </div>

          <div className="rule-item">
            <div className="rule-num">4</div>
            <div className="rule-text">
              <h6>Spin & Win</h6>
              <p>When the countdown reaches 0S, the Ferris Wheel spins and reveals Bob's choice. Winners receive their payout instantly.</p>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="custom-dialog-footer">
          <button className="dialog-confirm-btn" onClick={() => setOpen(false)}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
