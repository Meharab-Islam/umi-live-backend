import React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

const GameBlock = (props) => {
  const { dialog, setDialog } = props;
  const handleClose = () => {
    setDialog(false);
  };
  return (
    <>
      <Dialog className="disabled"
        open={dialog}
        style={{background:"#e5e4e2"}}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            <h3 class="fw-bold ">Game Not Available..!</h3>
          </DialogContentText>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GameBlock;
