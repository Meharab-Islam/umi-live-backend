import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../css/styles.scss";
import WinCoin from "../assets/WinCoin.png";
import RedChip from "../assets/redChip.png";
import GreenChip from "../assets/greenChip.png";
import { ReactComponent as CloseIcon } from "../assets/CloseIcon.svg";
import BlackChip from "../assets/blackChip.png";

export default function WinnerModel({
  open,
  locked,
  onClose,
  children,
  resultShow,
  mineTotalWin,
  setIsOpen,
  ...props
}) {
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    let timer;

    const decrementCount = () => {
      setSeconds((prevSeconds) => (prevSeconds > 0 ? prevSeconds - 1 : 0));
    };

    if (open && seconds > 0) {
      timer = setInterval(decrementCount, 1000);
    }

    return () => {
      clearInterval(timer);
    };
  }, [seconds, open]);
  
  return (
    <>
      {open && (
        <div className="winnerModel">
          <div className="winnerModel-bg">
            <div className="model">
              <div className="model-head">
                <img src={WinCoin} />
                <div className="time-count">
                           {seconds}
                </div>
              </div>
              <div className="model-body">
                <div className="winner-fram">
                  <h6>
                    Number <span>{resultShow?.no}</span>
                  </h6>
                </div>
                  <h5>My Grades: <span>{mineTotalWin ? mineTotalWin?.toLocaleString() : 0}</span></h5>
              </div>
            </div>
          </div>
        </div>
        // <div className="dialog">
        //   <div className="mainDiaogBox">
        //     <div className="winRibbin"></div>
        //     <div className="winRibbinShow"></div>
        //     <div className="dialog-data">
        //       <div className="show-closeData">
        //         <button className="close-btn" onClick={() => setIsOpen(false)}>
        //           <CloseIcon />{" "}
        //         </button>
        //       </div>
        //       <div className="dialog-head">
        //         <img src={WinCoin} />
        //       </div>
        //       <div className="dialog-body">
        //         {resultShow?.color === "green" && (
        //           <div className="chipNumberShow">
        //             <div>
        //               <img src={GreenChip} />
        //               <span>{resultShow?.no}</span>
        //             </div>
        //           </div>
        //         )}
        //         {resultShow?.color === "red" && (
        //           <div className="chipNumberShow">
        //             <div>
        //               <img src={RedChip} />
        //               <span>{resultShow?.no}</span>
        //             </div>
        //           </div>
        //         )}
        //         {resultShow?.color === "black" && (
        //           <div className="chipNumberShow">
        //             <div>
        //               <img src={BlackChip} />
        //               <span>{resultShow?.no}</span>
        //             </div>
        //           </div>
        //         )}
        //         <h6>
        //           My Grades: <span>{mineTotalWin}</span>
        //         </h6>
        //       </div>
        //     </div>
        //   </div>
        // </div>
      )}
    </>
  );
}
