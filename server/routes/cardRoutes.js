const express = require("express");
const Card = require("../models/Card");

const router = express.Router();

// Get all saved cards
router.get("/", async function (request, response) {
  try {
    const userId = request.query.userId || "demo-user";

    const cards = await Card.find({
      userId: userId
    }).sort({
      createdAt: -1
    });

    response.json(cards);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Unable to load collection."
    });
  }
});

// Add a card or increase its quantity
router.post("/", async function (request, response) {
  try {
    const userId = request.body.userId || "demo-user";
    const cardId = request.body.cardId;

    if (!cardId) {
      return response.status(400).json({
        message: "Card ID is required."
      });
    }

    const existingCard = await Card.findOne({
      userId: userId,
      cardId: cardId
    });

    if (existingCard) {
      existingCard.quantity += request.body.quantity || 1;

      if (typeof request.body.marketPrice === "number") {
        existingCard.marketPrice = request.body.marketPrice;
      }

      await existingCard.save();

      return response.json(existingCard);
    }

    const newCard = await Card.create({
      userId: userId,
      cardId: cardId,
      name: request.body.name,
      image: request.body.image,
      setName: request.body.setName,
      rarity: request.body.rarity,
      number: request.body.number,
      setTotal: request.body.setTotal,
      marketPrice: request.body.marketPrice,
      quantity: request.body.quantity || 1
    });

    response.status(201).json(newCard);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Unable to save the card."
    });
  }
});

router.patch("/:cardId", async function (request, response) {
  try {
    const userId = request.body.userId || "demo-user";
    const quantity = Number(request.body.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return response.status(400).json({
        message: "Quantity must be at least 1."
      });
    }

    const card = await Card.findOne({
      userId: userId,
      cardId: request.params.cardId
    });

    if (!card) {
      return response.status(404).json({
        message: "Card was not found."
      });
    }

    card.quantity = quantity;
    await card.save();

    response.json(card);
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Unable to update the card."
    });
  }
});


router.delete("/:cardId", async function (request, response) {
  try {
    const userId = request.query.userId || "demo-user";

    const result = await Card.deleteOne({
      userId: userId,
      cardId: request.params.cardId
    });

    if (result.deletedCount === 0) {
      return response.status(404).json({
        message: "Card was not found."
      });
    }

    response.json({
      message: "Card removed from the collection."
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Unable to remove the card."
    });
  }
});

module.exports = router;