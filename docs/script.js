const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const cardResults = document.querySelector(".card-results");

let currentCards = [];
let tcgFallbackCards = {};

initializeApp();

searchButton.addEventListener("click", searchCards);

searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    searchCards();
  }
});

async function initializeApp() {
  await loadTCGPriceFile();
  await loadNewCards();
}

async function loadTCGPriceFile() {
  try {
    const response = await fetch("./data/tcg-prices.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load fallback price data.");
    }

    const result = await response.json();

    tcgFallbackCards = result.cards ?? {};

    console.log(
      `Loaded ${Object.keys(tcgFallbackCards).length} fallback prices.`
    );
  } catch (error) {
    console.warn("Fallback prices could not be loaded.", error);
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
  const key = makeCardKey(
    card.set?.name ?? "",
    card.name ?? "",
    card.number ?? ""
  );

  return tcgFallbackCards[key];
}

async function searchCards() {
  const cardName = searchInput.value.trim();

  if (cardName === "") {
    cardResults.innerHTML = `
      <h2>Card Results</h2>
      <p>Please enter a Pokémon card name.</p>
    `;
    return;
  }

  cardResults.innerHTML = `
    <h2>Card Results</h2>
    <p>Searching for ${escapeHTML(cardName)}...</p>
  `;

  searchButton.disabled = true;
  searchButton.textContent = "Searching...";

  try {
    const cards = await fetchAllCards(cardName);
    displayCards(cards, cardName);
  } catch (error) {
    cardResults.innerHTML = `
      <h2>Card Results</h2>
      <p>There was a problem loading the cards. Please try again.</p>
    `;

    console.error(error);
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search";
  }
}

async function fetchAllCards(cardName) {
  const allCards = [];
  const pageSize = 250;

  let page = 1;
  let totalCount = 0;

  const safeSearchName = cardName.replace(/"/g, '\\"');
  const query = `name:"${safeSearchName}"`;

  do {
    const url =
      `https://api.pokemontcg.io/v2/cards` +
      `?q=${encodeURIComponent(query)}` +
      `&page=${page}` +
      `&pageSize=${pageSize}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Unable to load card data.");
    }

    const result = await response.json();

    allCards.push(...result.data);
    totalCount = result.totalCount ?? allCards.length;

    cardResults.innerHTML = `
      <h2>Card Results</h2>
      <p>Loading ${allCards.length} of ${totalCount} cards...</p>
    `;

    page++;
  } while (allCards.length < totalCount);

  return allCards;
}

function displayCards(cards, searchTerm) {
  currentCards = cards;
  
  if (cards.length === 0) {
    cardResults.innerHTML = `
      <h2>Card Results</h2>
      <p>No cards were found.</p>
    `;
    return;
  }

  const cardHTML = cards.map(function (card) {
    const price = getMarketPrice(card);
    const finishes = getAvailableFinishes(card);

    const cardName = escapeHTML(card.name);
    const setName = escapeHTML(card.set?.name ?? "Unknown set");
    const rarity = escapeHTML(card.rarity ?? "Not listed");
    const cardNumber = escapeHTML(card.number ?? "?");
    const setTotal = escapeHTML(card.set?.printedTotal ?? "?");

    return `
      <article class="card">
        <img
          class="card-image"
          src="${card.images.small}"
          alt="${cardName}"
          loading="lazy"
        >

        <div class="card-info">
          <h3>${cardName}</h3>

          <p class="card-detail">
            <span>Set</span>
            ${setName}
          </p>

          <p class="card-detail">
            <span>Rarity</span>
            ${rarity}
          </p>

          <p class="card-detail">
            <span>Card Number</span>
            ${cardNumber}/${setTotal}
          </p>

          <p class="card-detail">
            <span>Available</span>
            ${finishes}
          </p>

          <p class="market-price">
            ${price !== undefined
              ? `Current Price: $${price.toFixed(2)}`
              : "Current Price: Not available"}
          </p>
          
          <button
            class="collection-button"
            type="button"
            data-card-id="${card.id}"
          >
            Add to Collection
          </button>
        </div>
      </article>
    `;
  }).join("");

  const heading =
  searchTerm === "New & Noteworthy"
    ? "New & Noteworthy"
    : `${cards.length} results for “${escapeHTML(searchTerm)}”`;

cardResults.innerHTML = `
  <h2>${heading}</h2>

    <div class="card-grid">
      ${cardHTML}
    </div>
  `;
}

function getMarketPrice(card) {
  const prices = card.tcgplayer?.prices ?? {};

  const preferredFinishes = [
    prices.holofoil,
    prices.normal,
    prices.reverseHolofoil,
    prices["1stEditionHolofoil"],
    prices["1stEditionNormal"]
  ].filter(Boolean);

  // First choice: Pokémon TCG API market price
  for (const finish of preferredFinishes) {
    if (typeof finish.market === "number") {
      return finish.market;
    }
  }

  // Second choice: Pokémon TCG API Direct price
  for (const finish of preferredFinishes) {
    if (typeof finish.directLow === "number") {
      return finish.directLow;
    }
  }

  // Third choice: Pokémon TCG API lowest listing
  for (const finish of preferredFinishes) {
    if (typeof finish.low === "number") {
      return finish.low;
    }
  }

  // The Pokémon API had no price, so check TCGCSV.
  const fallbackCard = getFallbackCard(card);
  const fallbackPrices = fallbackCard?.prices ?? [];

  // Fourth choice: TCGCSV market price
  for (const finish of fallbackPrices) {
    if (typeof finish.marketPrice === "number") {
      return finish.marketPrice;
    }
  }

  // Fifth choice: TCGCSV Direct price
  for (const finish of fallbackPrices) {
    if (typeof finish.directLowPrice === "number") {
      return finish.directLowPrice;
    }
  }

  // Sixth choice: TCGCSV lowest listing
  for (const finish of fallbackPrices) {
    if (typeof finish.lowPrice === "number") {
      return finish.lowPrice;
    }
  }

  return undefined;
}

function getAvailableFinishes(card) {
  const prices = card.tcgplayer?.prices ?? {};
  const finishes = [];

  if (prices.normal) {
    finishes.push("Normal");
  }

  if (prices.holofoil) {
    finishes.push("Holo");
  }

  if (prices.reverseHolofoil) {
    finishes.push("Reverse Holo");
  }

  if (prices["1stEditionNormal"]) {
    finishes.push("1st Edition");
  }

  if (prices["1stEditionHolofoil"]) {
    finishes.push("1st Edition Holo");
  }

  return finishes.length > 0
    ? finishes.join(" • ")
    : "Not listed";
}
async function loadNewCards() {
  cardResults.innerHTML = `
    <h2>New & Noteworthy</h2>
    <p>Loading recently released cards...</p>
  `;

  try {
    const response = await fetch(
      "https://api.pokemontcg.io/v2/cards?page=1&pageSize=20&orderBy=-set.releaseDate"
    );

    if (!response.ok) {
      throw new Error("Unable to load new cards.");
    }

    const result = await response.json();

    displayCards(result.data, "New & Noteworthy");
  } catch (error) {
    cardResults.innerHTML = `
      <h2>New & Noteworthy</h2>
      <p>There was a problem loading the newest cards: ${escapeHTML(error.message)}</p>
    `;

    console.error(error);
  }
}

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

cardResults.addEventListener("click", function (event) {
  if (!event.target.classList.contains("collection-button")) {
    return;
  }

  const cardId = event.target.dataset.cardId;
  addToCollection(cardId, event.target);
});

function addToCollection(cardId, button) {
  const selectedCard = currentCards.find(function (card) {
    return card.id === cardId;
  });

  if (!selectedCard) {
    return;
  }

  const savedCollection =
    JSON.parse(localStorage.getItem("poTrackerCollection")) || [];

  const alreadySaved = savedCollection.some(function (card) {
    return card.id === selectedCard.id;
  });

  if (alreadySaved) {
    button.textContent = "Already in Collection";
    return;
  }

  const cardToSave = {
    id: selectedCard.id,
    name: selectedCard.name,
    image: selectedCard.images.small,
    setName: selectedCard.set.name,
    rarity: selectedCard.rarity ?? "Not listed",
    number: selectedCard.number,
    setTotal: selectedCard.set.printedTotal,
    marketPrice: getMarketPrice(selectedCard)
  };

  savedCollection.push(cardToSave);

  localStorage.setItem(
    "poTrackerCollection",
    JSON.stringify(savedCollection)
  );

  button.textContent = "Added to Collection";
  button.disabled = true;
}
