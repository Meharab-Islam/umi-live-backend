const mongoose = require("mongoose");

const GameHistorySchema = new mongoose.Schema(
  {
    cardCoin: {
      type: Array,
      default: 0,
    },
    date: {
      type: String,
      default: "",
    },
    winnerIndex: { type: Number, default: 0 },
    userBits: { type: Array, default: [] },
    combination: { type: Array, default: [] },
    updatedAdminCoin: { type: Number, default: 0 },
    winnerCoinMinus: { type: Number, default: 0 },
    totalAdd: { type: Number, default: 0 },
  },

  { timestamps: true, versionKey: false }
);

const GameHistory = mongoose.model("TeenPattiHistory", GameHistorySchema);

module.exports = GameHistory;
