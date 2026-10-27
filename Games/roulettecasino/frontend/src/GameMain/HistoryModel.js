import React, { useEffect, useState } from "react";
import { ReactComponent as CloseIcon } from "../assets/CloseIcon.svg";

export default function HistoryModel(props) {
  const { setOpen, open, historyData } = props;

  function dateFunction(dateString) {
    const dateObject = new Date(dateString);
    const timeString = dateObject.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return timeString;
  }

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
              <h6>My History</h6>
              <button className="close-icon" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="model-body">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Result</th>
                    <th>Amount</th>
                    <th>Win</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData  ?
                    historyData?.map((item, index) => {
                      return (
                        <tr>
                          <td>{index + 1}</td>
                          <td>{item?.date ? dateFunction(item?.date) : ""}</td>
                          <td>
                            <div
                             className="winner-Box"
                            >
                              <span  className="winner-number"
                              style={{
                                backgroundColor: `${item?.rouletteGame?.resultObj?.color}`,
                              }}>{item?.rouletteGame?.winNumber}</span>
                            </div>
                          </td>
                          <td>{item?.rouletteGame?.totalAddAmount}</td>
                          <td style={{color:"red",fontWeight:"500"}}>
                            {`${"+" +item?.rouletteGame?.winCoin}`}
                          </td>
                        </tr>
                      );
                    }):
                    <h6 className="not-history">No History...</h6>
                    }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
