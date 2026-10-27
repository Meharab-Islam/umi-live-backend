import React, { useEffect, useState } from "react";
import { ReactComponent as CloseIcon } from "../assets/CloseIcon.svg";

export default function RulesModel(props) {
  const { setOpen, open, rule } = props;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (open && !event.target.closest(".rules-model")) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("click", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [open, setOpen]);

  return (
    <>
      {open && (
        <div className="rules-model">
          <div className="rulesModelBox">
            <div className="model-head">
              <h6>How To Play</h6>
              <button className="close-icon" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="model-body">
              <p>Basic Instructions:</p>
              <ol>
                <li>
                  Select the chip block and click the betting area to place a
                  bet
                </li>
                <li>
                  After the countdown is over, the turntable starts to rotate
                  and a small ball appears. When the small ball stays in the
                  turntable area to get a certain result, you can get the gold
                  coin reward of the bet amount * odds in the betting area
                  corresponding to the result.
                </li>
              </ol>

              <p>Odds Explained:</p>
              <ul>
                <li>
                  <span>0</span> <span>x36</span>
                </li>
                <li>
                  <span>1-12</span> <span>x3</span>
                </li>
                <li>
                  <span>13-24</span> <span>x3</span>
                </li>
                <li>
                  <span>25-36</span>
                  <span>x3</span>
                </li>
                <li>
                  <span>Red</span> <span>x2</span>
                </li>
                <li>
                  <span>Black</span> <span>x2</span>
                </li>
                <li>
                  <span>Odd</span> <span>x2</span>
                </li>
                <li>
                  <span>Even</span> <span>x2</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
