const express = require("express");
const router = express.Router();

const gameHistoryRoute = require("../routes/gameHistory.route");

router.use("/gameHistory", gameHistoryRoute);

module.exports = router;
