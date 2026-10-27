const mongoose = require("mongoose");

const FerryWheelRoundCounterSchema = new mongoose.Schema(
  {
    counter: { type: Number, default: 0 },
    frame5RoundsSinceLastWin: { type: Number, default: 0 },
    frame6RoundsSinceLastWin: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("FerryWheelRoundCounter", FerryWheelRoundCounterSchema);
