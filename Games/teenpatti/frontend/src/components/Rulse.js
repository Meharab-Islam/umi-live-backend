import * as React from "react";
import "../style/history.css";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";

import Typography from "@mui/material/Typography";
import RulesBg from "../images/RulesBg.png";
import Slide from "@mui/material/Slide";
import { useState } from "react";
import { useEffect } from "react";
import { baseURL } from "../config";


const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="left" ref={ref} {...props} />;
});

const Rulse = (props) => {
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
              Rules
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
        <div className="rules-page">
          {/* <div class="row sticky-topFrame ">
            <div className="imageTop">
              <span>How To Play</span>
            </div>
          </div> */}
          <div className="rules-show">
            <div className="top-rules">
              <ul>
                <li>
                  <span>BJECTIVE OF TEEN PATTI:</span>
                  <p>
                    Have the best three cards in your hand and maximize the pot
                    before the showdown.
                  </p>
                </li>
                <li>
                  <span>NUMBER OF PLAYERS:</span>
                  <p>3-6 Players</p>
                </li>
                <li>
                  <span>NUMBER OF CARDS: </span>
                  <p>52 card deck</p>
                </li>
                <li>
                  <span>RANK OF CARDS: </span>
                  <p>A (High), K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2</p>
                </li>
              </ul>
            </div>
            <div className="center-rules">
              <h5>THE DEAL | TEEN PATTI</h5>
              <h6>
                Teen Patti is a 3-card poker game for 3 to 6 players. The
                objective is to have the best 3-card hand and to place bets
                before the showdown.
              </h6>
              <p>
                Each player in the game is given 3 cards face-down. Before the
                deal, a <span>boot</span> amount is agreed upon and collected
                from each player. This is the minimum stake put into the{" "}
                <span>pot</span> (the money kept in the center of the table). As
                the game progresses, the pot grows and is won by the winner of
                that hand. The winner is the player who remains in the game for
                the whole hand and has the highest or best hand.
              </p>
            </div>
            <div className="end-rules">
              <h5>RANKING OF HANDS</h5>
              <h6> Hands ranked from highest to lowest:</h6>

              <ul>
                <li>
                  Trail (Three of a Kind/Set/Trio): Three cards of the same
                  rank. Aces are the highest, twos are the lowest.
                </li>
                <li>
                  Pure Sequence (Straight Flush/Run): Three consecutive cards
                  within the same suit. For example, A-K-Q of diamonds.
                </li>
                <li>
                  Sequence (Straight/Normal Run): Three consecutive cards not
                  within the same suit.
                </li>
                <li>
                  Color (Flush/Colous): Three cards in the same suit but not in
                  sequence. In the event of comparing two colors, compare the
                  highest value card (and if those are equal, the next, and so
                  on). The highest color is A-K-J and the lowest is 5-3-2.
                </li>
                <li>
                  Pair (Two of a Kind): Two cards that are the same rank. In
                  comparing these hands, first, compare the pair. If the pair is
                  equal, the highest oddball card wins. A-A-K is the highest
                  pair and 2-2-3 is the lowest.
                </li>
                <li>
                  High Card: If the three cards do not fit in the above
                  categories, compare the highest card first (then second and so
                  on). The best hand is A-K-J (with mixed suits) and the lowest
                  is 5-3-2.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default Rulse;
