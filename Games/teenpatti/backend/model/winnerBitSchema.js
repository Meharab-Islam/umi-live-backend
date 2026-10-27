const mongoose = require("mongoose");

const WinnerBitSchema = new mongoose.Schema({
  winner: {
    type: Array,
    default: [],
    required: true,
  },
});

const WinnerBit = mongoose.model("WinnerBit", WinnerBitSchema);

module.exports = WinnerBit;

//winner : { 0 : "High"
//           1: "low"
//           2:"mid" .....100 }

// this value is probabilities wise : createWinnerBit function
