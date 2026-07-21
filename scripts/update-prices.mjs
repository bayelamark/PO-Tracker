import { mkdir, writeFile } from "node:fs/promises";

const CATEGORY_ID = 3;
const MAX_GROUPS = 40;
const REQUIRED_GROUP_IDS = [24688];
const BASE_URL = "https://tcgcsv.com/tcgplayer";

function delay(milliseconds) {
  return new Promise(function (resolve) {
    setTimeout(resolve, milliseconds);
  });
}

async function fetchJSON(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PO-Tracker/1.0 Student Project"
    }
  });

  // Some TCGplayer groups do not contain products.
  if (response.status === 404) {
    return {
      results: []
    };
  }

  if (!response.ok) {
    throw new Error(
      `Request failed with status ${response.status}: ${url}`
    );
  }

  const result = await response.json();

  if (result.success === false) {
    throw new Error(`TCGCSV returned an error for: ${url}`);
  }

  return result;
}

function getExtendedValue(product, fieldName) {
  const field = product.extendedData?.find(function (item) {
    return item.name === fieldName;
  });

  return field?.value;
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

async function updatePrices() {
  console.log("Downloading Pokémon set information...");

  const groupsResult = await fetchJSON(
    `${BASE_URL}/${CATEGORY_ID}/groups`
  );

 const newestGroups = [...groupsResult.results]
  .sort(function (groupA, groupB) {
    const dateA = new Date(
      groupA.modifiedOn ?? groupA.publishedOn ?? 0
    ).getTime();

    const dateB = new Date(
      groupB.modifiedOn ?? groupB.publishedOn ?? 0
    ).getTime();

    return dateB - dateA;
  })
  .slice(0, MAX_GROUPS);


for (const requiredGroupId of REQUIRED_GROUP_IDS) {
  const requiredGroup = groupsResult.results.find(function (group) {
    return group.groupId === requiredGroupId;
  });

  const alreadyIncluded = newestGroups.some(function (group) {
    return group.groupId === requiredGroupId;
  });

  if (requiredGroup && !alreadyIncluded) {
    newestGroups.push(requiredGroup);
  }
}

  const output = {
    updatedAt: new Date().toISOString(),
    source: "TCGCSV",
    groupsIncluded: newestGroups.map(function (group) {
      return {
        groupId: group.groupId,
        name: group.name,
        publishedOn: group.publishedOn
      };
    }),
    cards: {}
  };

  for (const group of newestGroups) {
    console.log(`Downloading ${group.name}...`);

    const productsResult = await fetchJSON(
      `${BASE_URL}/${CATEGORY_ID}/${group.groupId}/products`
    );

    await delay(250);

    const pricesResult = await fetchJSON(
      `${BASE_URL}/${CATEGORY_ID}/${group.groupId}/prices`
    );

    await delay(250);

    const pricesByProduct = new Map();

    for (const price of pricesResult.results) {
      if (!pricesByProduct.has(price.productId)) {
        pricesByProduct.set(price.productId, []);
      }

      pricesByProduct.get(price.productId).push({
        finish: price.subTypeName,
        marketPrice: price.marketPrice,
        directLowPrice: price.directLowPrice,
        lowPrice: price.lowPrice
      });
    }

    for (const product of productsResult.results) {
      const cardNumber = getExtendedValue(product, "Number");
      const rarity = getExtendedValue(product, "Rarity");

      // This removes booster boxes, packs and other sealed products.
      if (!cardNumber || !rarity) {
        continue;
      }

      const prices = pricesByProduct.get(product.productId) ?? [];

      if (prices.length === 0) {
        continue;
      }

      const key = makeCardKey(
        group.name,
        product.name,
        cardNumber
      );

      output.cards[key] = {
        productId: product.productId,
        name: product.name,
        setName: cleanSetName(group.name),
        number: cardNumber,
        rarity,
        tcgplayerUrl: product.url,
        prices
      };
    }
  }

  await mkdir("docs/data", {
    recursive: true
  });

  await writeFile(
    "docs/data/tcg-prices.json",
    JSON.stringify(output, null, 2),
    "utf8"
  );

  console.log(
    `Finished. Saved prices for ${
      Object.keys(output.cards).length
    } cards.`
  );
}

updatePrices().catch(function (error) {
  console.error("Price update failed.");
  console.error(error);
  process.exitCode = 1;
});
