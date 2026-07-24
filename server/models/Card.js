const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: "demo-user"
    },

    cardId: {
      type: String,
      required: true
    },

    name: {
      type: String,
      required: true
    },

    image: {
      type: String,
      required: true
    },

    setName: {
      type: String,
      required: true
    },

    rarity: {
      type: String,
      default: "Not listed"
    },

    number: {
      type: String,
      required: true
    },

    setTotal: {
      type: Number
    },

    marketPrice: {
      type: Number
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  {
    timestamps: true
  }
);

cardSchema.index(
  {
    userId: 1,
    cardId: 1
  },
  {
    unique: true
  }
);

module.exports = mongoose.model("Card", cardSchema);