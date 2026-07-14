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
    <p>Searching for ${cardName}...</p>
  `;

  try {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(cardName)}&pageSize=10`
    );

    if (!response.ok) {
      throw new Error("Unable to load card data.");
    }

    const result = await response.json();
    displayCards(result.data);
  } catch (error) {
    cardResults.innerHTML = `
      <h2>Card Results</h2>
      <p>There was a problem loading the cards. Please try again.</p>
    `;

    console.error(error);
  }
}

function displayCards(cards) {
  if (cards.length === 0) {
    cardResults.innerHTML = `
      <h2>Card Results</h2>
      <p>No cards were found.</p>
    `;
    return;
  }

  const cardHTML = cards.map(function (card) {
    const price =
      card.tcgplayer?.prices?.holofoil?.market ??
      card.tcgplayer?.prices?.normal?.market ??
      card.tcgplayer?.prices?.reverseHolofoil?.market;

    return `
      <article class="card">
        <img src="${card.images.small}" alt="${card.name}">
        <h3>${card.name}</h3>
        <p>Set: ${card.set.name}</p>
        <p>Number: ${card.number}</p>
        <p>
          Market price:
          ${price ? `$${price.toFixed(2)}` : "Not available"}
        </p>
      </article>
    `;
  }).join("");

  cardResults.innerHTML = `
    <h2>Card Results</h2>
    <div class="card-grid">
      ${cardHTML}
    </div>
  `;
}
