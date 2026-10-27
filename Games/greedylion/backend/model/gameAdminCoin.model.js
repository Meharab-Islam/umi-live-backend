const mongoose = require('mongoose');

const GameAdminCoinSchema = new mongoose.Schema(
  {
    coin: { type: Number, default: 0 },
    totalCoin: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('GameAdminCoin', GameAdminCoinSchema);
