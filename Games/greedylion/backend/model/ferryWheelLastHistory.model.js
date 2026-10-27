const mongoose = require('mongoose');

const ferryWheelLastHistorySchema = new mongoose.Schema(
  { winnerNumber: [], totalRound: { type: Number, default: 0 } },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model(
  'ferryWheelLastHistory',
  ferryWheelLastHistorySchema
);
