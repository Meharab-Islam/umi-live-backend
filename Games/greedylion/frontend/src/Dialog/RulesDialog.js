import React, { useEffect } from "react";
import { ReactComponent as LeftIcon } from "../assets/image/LeftArrow.svg";

export default function RulesDialog(props) {
  const { open, setOpen } = props;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (open && !event.target.closest('.rules-dialog')) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [open, setOpen]);

  return (
    <>
      {open && (
        <div className="rules-dialog">
          <div className="dialog-box">
            <div className="dialog-head">
              <button onClick={() => setOpen(false)}>
                <LeftIcon />
              </button>
              <div>
                <h5>Rules</h5>
              </div>
            </div>
            <div className="dialog-body">
              <ol>
                <li>
                  Please choose the amount of the food you would like to bet on
                  and all winners bet on the winning food will get the
                  corresponding diamonds.
                </li>
                <li>The time for betting is 40 seconds each round.</li>
                <li>
                  You can bet on up to 6 kinds of food each round. There is no
                  limit for the amount you bet.
                </li>
                <li>
                  Olamet reserves all rights of interpretation of the event.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
