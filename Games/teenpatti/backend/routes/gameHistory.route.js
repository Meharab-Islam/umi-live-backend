const express = require("express");
const router = express.Router();

const gameHistoryController = require("../controllers/gameHistory.controller");

// get level
router.get("/get", gameHistoryController.getIndex);
router.get("/result", gameHistoryController.result);

module.exports = router;
