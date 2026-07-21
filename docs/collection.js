const collectionResults = document.querySelector("#collectionResults");

let savedCollection =
  JSON.parse(localStorage.getItem("poTrackerCollection")) || [];

let tcgFallbackCards = {};

initializeCollection();

async function initializeCollection() {
  await loadTCGPriceFile();
  updateSavedPrices();
  displayCollection(savedCollection);
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
  let pricesChanged = false;

  savedCollection.forEach(function (card) {
    const updatedPrice = getFallbackPrice(card);

    if (
      typeof updatedPrice === "number" &&
      card.marketPrice !== updatedPrice
    ) {
      card.marketPrice = updatedPrice;
      pricesChanged = true;
    }
  });

  if (pricesChanged) {
    localStorage.setItem(
      "poTrackerCollection",
      JSON.stringify(savedCollection)
    );
  }
}

function displayCollection(cards) {
  if (cards.length === 0) {
    collectionResults.innerHTML = `
      <h2>No Cards Yet</h2>
      <p>Search for cards and add them to your collection.</p>
    `;
    return;
  }
  
const totalValue = cards.reduce(function (total, card) {
  const currentPrice = getCurrentPrice(card);

  return total + (
    typeof currentPrice === "number"
      ? currentPrice
      : 0
  );
}, 0);
  
  const cardHTML = cards.map(function (card) {
    const currentPrice = getCurrentPrice(card);

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
      <strong>${cards.length}</strong>
    </div>

    <div class="summary-item">
      <span>Estimated Value</span>
      <strong>$${totalValue.toFixed(2)}</strong>
    </div>
  </div>

  <h2>My Cards</h2>

  <div class="card-grid">
    ${cardHTML}
  </div>
`;
}

collectionResults.addEventListener("click", function (event) {
  if (!event.target.classList.contains("remove-button")) {
    return;
  }

  const cardId = event.target.dataset.cardId;

  savedCollection = savedCollection.filter(function (card) {
    return card.id !== cardId;
  });

  localStorage.setItem(
    "poTrackerCollection",
    JSON.stringify(savedCollection)
  );

  displayCollection(savedCollection);
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
