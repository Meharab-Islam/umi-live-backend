const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema({
  cardArray: { type: Array, required: true },
});

const Card = mongoose.model("Card", CardSchema);

module.exports = Card;

// array size 100
// 1[obj] : { firstValue : "HighCard",
//            secondValue:"Pure",
//            thirdValue:"HighCard"  }
