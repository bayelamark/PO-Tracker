const searchInput = document.querySelector("#searchInput");
const searchButton = document.querySelector("#searchButton");
const resultsMessage = document.querySelector("#resultsMessage");

searchButton.addEventListener("click", function () {
  const cardName = searchInput.value.trim();

  if (cardName === "") {
    resultsMessage.textContent = "Please enter a Pokémon card name.";
  } else {
    resultsMessage.textContent =
      `Searching for "${cardName}"... Card data will be added later.`;
  }
});
