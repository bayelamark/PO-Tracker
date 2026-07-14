const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const cardResults = document.querySelector(".card-results");

searchButton.addEventListener("click", searchCards);

searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    searchCards();
  }
});

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
              ? `Market Price: $${price.toFixed(2)}`
              : "Market Price: Not available"}
          </p>
        </div>
      </article>
    `;
  }).join("");

  cardResults.innerHTML = `
    <h2>${cards.length} results for “${escapeHTML(searchTerm)}”</h2>

    <div class="card-grid">
      ${cardHTML}
    </div>
  `;
}

function getMarketPrice(card) {
  const prices = card.tcgplayer?.prices ?? {};

  const availablePrices = [
    prices.holofoil?.market,
    prices.normal?.market,
    prices.reverseHolofoil?.market,
    prices["1stEditionHolofoil"]?.market,
    prices["1stEditionNormal"]?.market
  ];

  return availablePrices.find(function (price) {
    return typeof price === "number";
  });
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
