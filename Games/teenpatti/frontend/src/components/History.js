import * as React from "react";
import "../style/history.css";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";

import Typography from "@mui/material/Typography";

import Slide from "@mui/material/Slide";
import { useState } from "react";
import { useEffect } from "react";
import { baseURL } from "../config";


const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="left"
      ref={ref}
      {...props}
    />
  );
});

const History = (props) => {
  const { dialog, setDialog } = props;

  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);

  const handleClose = () => {
    setDialog(false);
  };

  useEffect(() => {
    setOpen(true);
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    };

    fetch(`${baseURL}gameHistory/result`, requestOptions)
      .then((response) => response.json())
      .then((res) => {
        setData(res.gameHistories);
      })
      .catch((error) => {
        console.error(error);
        setOpen(false);
      })
      .finally(() => {
        console.log("open", open);
        setOpen(false);
      });
  }, []);

  useEffect(() => {
    console.log("open", open);
  }, [open]);

  return (
    <>
      <Dialog
        fullScreen
        open={dialog}
        onClose={handleClose}
        TransitionComponent={Transition}
      >
        <AppBar
          sx={{ position: "relative" }}
          class="bg-white border-bottom sticky-top"
        >
          <Toolbar>
            <Typography
              sx={{ ml: 1, flex: 1 }}
              variant="h6"
              component="div"
              className="text-dark"
            >
              <span>{"< "}</span>
              History
            </Typography>
            <Button
              autoFocus
              color="inherit"
              onClick={handleClose}
              className="fw-bold"
            >
              Close
            </Button>
          </Toolbar>
        </AppBar>
        <div>
          <div class="row sticky-topFrame ">
            <div className="col-4">
              <h2
                class="text-center historyFont"
                style={{ color: "#ff7a00" }}
              >
                A
              </h2>
            </div>
            <div
              className="col-4"
              style={{ color: "#ffa800" }}
            >
              <h2 class="text-center historyFont">B</h2>
            </div>
            <div className="col-4">
              <h2
                class="text-center historyFont"
                style={{ color: "#eec800" }}
              >
                C
              </h2>
            </div>
          </div>
          <div class=" mt-5">
            {open === true ? (
              <div class="col-sm-6 text-center">
                <div class="loader1">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            ) : data?.length > 0 ? (
              data.map((history, i) => {
                return (
                  <div
                    key={i}
                    className="row"
                  >
                    {history.cardCoin.map((data, j) => {
                      return (
                        <div
                          key={j}
                          className="col-4 d-flex justify-content-center align-items-center"
                        >
                          <p
                            class={`${
                              data.winner ? "bg-danger" : "failButton"
                            } border rounded-circle winCircle`}
                          >
                            {data.winner ? "Win" : "Lose"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <p class="mt-no-1">No Data Found !!</p>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default History;
