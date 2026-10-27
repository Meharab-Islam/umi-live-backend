import React, { useEffect } from 'react'
import { ReactComponent as CloseIcon } from "../assets/CloseIcon.svg";

export default function BetHistoryModel(props) {
    const {
        open,
        setOpen,
        historyData
    }=props

    useEffect(() => {
      const handleOutsideClick = (event) => {
        if (open && !event.target.closest('.history-model')) {
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
    {
        open&&(
            <div className='history-model'>
                     <div className='historyModelBox'>
                     <div className='model-head'>
                         <h6>Nearly Twenty Innings</h6>
                         <button className='close-icon' onClick={()=>setOpen(false)}>
                         <CloseIcon />
                         </button>
                        </div>
                        <div className='model-body'>
                          {
                            historyData?.length > 0 ? (
                              historyData?.map((item)=>{
                                return(
                                  <div className='round-number' style={{backgroundColor:`${item?.color}`}}>
                                      <h6>{item?.no}</h6>
                                    </div>
                                )
                              })
                            ) : (
                              <h5>Not Result...</h5>
                            )
                          }
                        </div>
                     </div>
               </div>
        )
    }
    </>
  )
}
