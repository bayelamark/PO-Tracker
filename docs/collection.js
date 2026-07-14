const collectionResults = document.querySelector("#collectionResults");

const savedCollection =
  JSON.parse(localStorage.getItem("poTrackerCollection")) || [];

displayCollection(savedCollection);

function displayCollection(cards) {
  if (cards.length === 0) {
    collectionResults.innerHTML = `
      <h2>No Cards Yet</h2>
      <p>Search for cards and add them to your collection.</p>
    `;
    return;
  }

  const cardHTML = cards.map(function (card) {
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
              typeof card.marketPrice === "number"
                ? `Market Price: $${card.marketPrice.toFixed(2)}`
                : "Market Price: Not available"
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
    <h2>${cards.length} Cards</h2>

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

  const updatedCollection = savedCollection.filter(function (card) {
    return card.id !== cardId;
  });

  localStorage.setItem(
    "poTrackerCollection",
    JSON.stringify(updatedCollection)
  );

  window.location.reload();
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
