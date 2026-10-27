const mongoose = require('mongoose');

const rouletteLastHistorySchema = new mongoose.Schema(
  { winnerNumber: [{}] },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model(
  'RouletteLastHistory',
  rouletteLastHistorySchema
);
