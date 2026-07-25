const collectionResults = document.querySelector("#collectionResults");
const sortCollection = document.querySelector("#sortCollection");
const collectionSearch =
  document.querySelector("#collectionSearch");

const API_URL =
  "https://po-tracker-d17j.onrender.com/api/cards";

let savedCollection = [];

let tcgFallbackCards = {};

if (requireLogin()) {
  initializeCollection();
}
if (sortCollection) {
  sortCollection.addEventListener("change", function () {
    displayCollection(savedCollection);
  });
}

if (collectionSearch) {
  collectionSearch.addEventListener("input", function () {
    displayCollection(savedCollection);
  });
}

async function initializeCollection() {
  await loadTCGPriceFile();

  const collectionLoaded = await loadSavedCollection();

  if (!collectionLoaded) {
    return;
  }

  updateSavedPrices();
  displayCollection(savedCollection);
}

async function loadSavedCollection() {
  try {
   const response = await fetch(API_URL, {
    cache: "no-store",
    headers: getAuthHeaders(false)
   });

    if (!response.ok) {
      throw new Error("Unable to load your collection.");
    }

    const cards = await response.json();

    savedCollection = cards.map(function (card) {
      return {
        id: card.cardId,
        name: card.name,
        image: card.image,
        setName: card.setName,
        rarity: card.rarity,
        number: card.number,
        setTotal: card.setTotal,
        marketPrice: card.marketPrice,
        quantity: card.quantity
      };
    });

    return true;
  } catch (error) {
    console.error(error);

    collectionResults.innerHTML = `
      <h2>Unable to Load Collection</h2>
      <p>Please try refreshing the page.</p>
    `;

    return false;
  }
}

async function loadTCGPriceFile() {
  try {
    const response = await fetch("./data/tcg-prices.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load current price data.");
    }

    const result = await response.json();
    tcgFallbackCards = result.cards ?? {};

    console.log(
      `Loaded ${Object.keys(tcgFallbackCards).length} collection prices.`
    );
  } catch (error) {
    console.warn("Current collection prices could not be loaded.", error);
    tcgFallbackCards = {};
  }
}

function cleanSetName(setName) {
  return String(setName)
    .replace(/^[A-Z0-9-]{2,15}:\s*/i, "")
    .trim();
}

function normalizeText(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeCardNumber(value) {
  const cardNumber = String(value).split("/")[0].trim();

  if (/^\d+$/.test(cardNumber)) {
    return String(Number(cardNumber));
  }

  return normalizeText(cardNumber).replace(/\s/g, "");
}

function makeCardKey(setName, cardName, cardNumber) {
  return [
    normalizeText(cleanSetName(setName)),
    normalizeText(cardName),
    normalizeCardNumber(cardNumber)
  ].join("|");
}

function getFallbackCard(card) {
  const exactKey = makeCardKey(
    card.setName ?? "",
    card.name ?? "",
    card.number ?? ""
  );

  const exactMatch = tcgFallbackCards[exactKey];

  if (exactMatch) {
    return exactMatch;
  }

  const wantedSet = normalizeText(
    cleanSetName(card.setName ?? "")
  );

  const wantedNumber = normalizeCardNumber(
    card.number ?? ""
  );

  return Object.values(tcgFallbackCards).find(function (fallbackCard) {
    const fallbackSet = normalizeText(
      cleanSetName(fallbackCard.setName ?? "")
    );

    const fallbackNumber = normalizeCardNumber(
      fallbackCard.number ?? ""
    );

    return (
      fallbackSet === wantedSet &&
      fallbackNumber === wantedNumber
    );
  });
}

function getFallbackPrice(card) {
  const fallbackCard = getFallbackCard(card);
  const prices = fallbackCard?.prices ?? [];

  // First choice: TCGplayer market price
  for (const finish of prices) {
    if (typeof finish.marketPrice === "number") {
      return finish.marketPrice;
    }
  }

  // Second choice: TCGplayer Direct price
  for (const finish of prices) {
    if (typeof finish.directLowPrice === "number") {
      return finish.directLowPrice;
    }
  }

  // Third choice: lowest current listing
  for (const finish of prices) {
    if (typeof finish.lowPrice === "number") {
      return finish.lowPrice;
    }
  }

  return undefined;
}

function getCurrentPrice(card) {
  const updatedPrice = getFallbackPrice(card);

  if (typeof updatedPrice === "number") {
    return updatedPrice;
  }

  if (typeof card.marketPrice === "number") {
    return card.marketPrice;
  }

  return undefined;
}

function updateSavedPrices() {
  savedCollection.forEach(function (card) {
    const updatedPrice = getFallbackPrice(card);

    if (typeof updatedPrice === "number") {
      card.marketPrice = updatedPrice;
    }
  });
}

function getFilteredCards(cards) {
  const searchTerm =
    collectionSearch?.value.trim().toLowerCase() ?? "";

  if (searchTerm === "") {
    return cards;
  }

  return cards.filter(function (card) {
    const searchableInformation = [
      card.name,
      card.setName,
      card.rarity,
      card.number
    ]
      .join(" ")
      .toLowerCase();

    return searchableInformation.includes(searchTerm);
  });
}

function getSortedCards(cards) {
  const sortedCards = [...cards];
  const sortType = sortCollection?.value ?? "name";

  if (sortType === "name") {
    sortedCards.sort(function (cardA, cardB) {
      return cardA.name.localeCompare(cardB.name);
    });
  }

  if (sortType === "set") {
    sortedCards.sort(function (cardA, cardB) {
      return cardA.setName.localeCompare(cardB.setName);
    });
  }

  if (sortType === "price-high") {
    sortedCards.sort(function (cardA, cardB) {
      const priceA = getCurrentPrice(cardA) ?? 0;
      const priceB = getCurrentPrice(cardB) ?? 0;

      return priceB - priceA;
    });
  }

  if (sortType === "price-low") {
    sortedCards.sort(function (cardA, cardB) {
      const priceA = getCurrentPrice(cardA) ?? Number.MAX_VALUE;
      const priceB = getCurrentPrice(cardB) ?? Number.MAX_VALUE;

      return priceA - priceB;
    });
  }

  return sortedCards;
}

function displayCollection(cards) {
  if (cards.length === 0) {
    collectionResults.innerHTML = `
      <h2>No Cards Yet</h2>
      <p>Search for cards and add them to your collection.</p>
    `;
    return;
  }
  
  const totalCards = cards.reduce(function (total, card) {
    return total + (card.quantity ?? 1);
  }, 0);

  const totalValue = cards.reduce(function (total, card) {
    const currentPrice = getCurrentPrice(card);
    const quantity = card.quantity ?? 1;

  return total + (
    typeof currentPrice === "number"
      ? currentPrice * quantity
      : 0
    );
  }, 0);
  
  const filteredCards = getFilteredCards(cards);
  const sortedCards = getSortedCards(filteredCards);

  const cardHTML = sortedCards.map(function (card) {
    const currentPrice = getCurrentPrice(card);
    const quantity = card.quantity ?? 1;

    return `
      <article class="card">
        <img
          class="card-image"
          src="${card.image}"
          alt="${escapeHTML(card.name)}"
          loading="lazy"
        >

        <div class="card-info">
          <h3>${escapeHTML(card.name)}</h3>

          <p class="card-detail">
            Set: ${escapeHTML(card.setName)}
          </p>

          <p class="card-detail">
            Rarity: ${escapeHTML(card.rarity)}
          </p>

          <p class="card-detail">
            Card Number: ${escapeHTML(card.number)}/${escapeHTML(card.setTotal)}
          </p>

          <div class="quantity-controls">
            <button
                class="quantity-button"
                type="button"
                data-action="decrease"
                data-card-id="${card.id}"
              >
                −
              </button>

              <span>Quantity: ${quantity}</span>

              <button
                class="quantity-button"
                type="button"
                data-action="increase"
                data-card-id="${card.id}"
              >
                +
              </button>
            </div>

          <p class="market-price">
            ${
              typeof currentPrice === "number"
                ? `Current Price: $${currentPrice.toFixed(2)}`
                : "Current Price: Not available"
            }
          </p>

          <button
            class="remove-button"
            type="button"
            data-card-id="${card.id}"
          >
            Remove from Collection
          </button>
        </div>
      </article>
    `;
  }).join("");

 collectionResults.innerHTML = `
  <div class="collection-summary">
    <div class="summary-item">
      <span>Total Cards</span>
      <strong>${totalCards}</strong>
    </div>

    <div class="summary-item">
      <span>Estimated Value</span>
      <strong>$${totalValue.toFixed(2)}</strong>
    </div>
  </div>

  <h2>My Cards</h2>

  ${
    sortedCards.length > 0
      ? `
        <div class="card-grid">
          ${cardHTML}
        </div>
      `
      : `
        <p class="no-results">
          No cards in your collection match that search.
        </p>
      `
  }
`;
}

collectionResults.addEventListener("click", async function (event) {
  const cardId = event.target.dataset.cardId;

  if (!cardId) {
    return;
  }

  const selectedCard = savedCollection.find(function (card) {
    return card.id === cardId;
  });

  if (!selectedCard) {
    return;
  }

  event.target.disabled = true;

  try {
    if (event.target.classList.contains("quantity-button")) {
      const currentQuantity = selectedCard.quantity ?? 1;
      const action = event.target.dataset.action;

      let newQuantity = currentQuantity;

      if (action === "increase") {
        newQuantity = currentQuantity + 1;
      }

      if (action === "decrease") {
        if (currentQuantity <= 1) {
          return;
        }

        newQuantity = currentQuantity - 1;
      }

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(cardId)}`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            quantity: newQuantity
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to update quantity."
        );
      }

      selectedCard.quantity = result.quantity;
      displayCollection(savedCollection);
      return;
    }

    if (event.target.classList.contains("remove-button")) {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(cardId)}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(false)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to remove the card."
        );
      }

      savedCollection = savedCollection.filter(function (card) {
        return card.id !== cardId;
      });

      displayCollection(savedCollection);
    }
  } catch (error) {
    console.error(error);
    alert(error.message);
  } finally {
    event.target.disabled = false;
  }
});

function escapeHTML(value) {
  const characters = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  };

  return String(value).replace(/[&<>"']/g, function (character) {
    return characters[character];
  });
}
