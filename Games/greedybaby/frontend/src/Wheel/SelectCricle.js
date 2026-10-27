import React from "react";

export default function SelectCricle(props) {
  const {
    styles,
    image,
    lineCricleStlye,
    cricleMainStlye,
    onClick,
    framNo,
    selectFrame,
    timeText,
  } = props;

  return (
    <div
      className={`cricle-wheel ${selectFrame?.Bit > 0 ? "active-bet" : ""}`}
      style={{
        left: cricleMainStlye?.left,
        top: cricleMainStlye?.top,
        bottom: cricleMainStlye?.bottom,
        transform: cricleMainStlye?.transform,
        right: cricleMainStlye?.right,
      }}
      onClick={onClick}
    >
      {(selectFrame?.Bit > 0 ? selectFrame?.selectFrame === framNo : "") ? (
        <div className="details-win details-win-selecetd" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <img src={image} style={{ marginBottom: '2px' }} />
          <span className="multiplier-text">{timeText}</span>
        </div>
      ) : (
        <div className="details-win" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <img src={image} style={{ marginBottom: '2px' }} />
          <span className="multiplier-text">{timeText}</span>
        </div>
      )}
      <div class="gray"></div>
      <div class="winnerFram"></div>
      {
        (selectFrame?.Bit > 0 ? selectFrame?.selectFrame === framNo : "") && (
          <div className="selected-fram">
            <div className="bet-details">
              <h6>{selectFrame?.Bit}</h6>
            </div>
          </div>
        )
      }
    </div >
  );
}
