"use client";

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "can",
  "could",
  "for",
  "from",
  "i",
  "in",
  "it",
  "like",
  "me",
  "my",
  "need",
  "of",
  "on",
  "please",
  "product",
  "products",
  "show",
  "some",
  "the",
  "this",
  "to",
  "would",
  "want",
  "you",
  "your",
]);


export const normalizeSearchText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();


export const tokenizeSearch = (value = "", { stripStopWords = false } = {}) =>
  normalizeSearchText(value)
    .split(" ")
    .filter(
      (token) => token && (!stripStopWords || !SEARCH_STOP_WORDS.has(token))
    );


const getTokenMetrics = (sourceTokens, queryTokens) => {
  const sharedMatches = queryTokens.filter((token) => sourceTokens.includes(token)).length;
  const prefixMatches = queryTokens.filter((token) =>
    sourceTokens.some((sourceToken) => sourceToken.startsWith(token) || token.startsWith(sourceToken))
  ).length;

  return { sharedMatches, prefixMatches };
};


export const scoreTextMatch = (source = "", query = "") => {
  const normalizedSource = normalizeSearchText(source);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedSource || !normalizedQuery) {
    return 0;
  }

  if (normalizedSource === normalizedQuery) {
    return 150;
  }

  if (normalizedSource.includes(normalizedQuery)) {
    return 120;
  }

  const sourceTokens = tokenizeSearch(normalizedSource, { stripStopWords: true });
  const queryTokens = tokenizeSearch(normalizedQuery, { stripStopWords: true });

  if (!sourceTokens.length || !queryTokens.length) {
    return 0;
  }

  const { sharedMatches, prefixMatches } = getTokenMetrics(sourceTokens, queryTokens);

  if (!sharedMatches && !prefixMatches) {
    return 0;
  }

  let score = sharedMatches * 22 + prefixMatches * 12;

  if (sharedMatches === queryTokens.length) {
    score += 18;
  }

  if (
    queryTokens.length > 1 &&
    queryTokens.every((token) => normalizedSource.includes(token))
  ) {
    score += 10;
  }

  return score;
};


export const scoreProductMatch = (product, query) => {
  if (!product) {
    return 0;
  }

  const nameScore = scoreTextMatch(product.name, query) * 3;
  const categoryScore = scoreTextMatch(product.category?.name || "", query) * 2;
  const descriptionScore = scoreTextMatch(product.description || "", query);

  return nameScore + categoryScore + descriptionScore;
};


export const filterProductsByQuery = (products = [], query = "") => {
  const normalizedQuery = normalizeSearchText(query);
  const relevantTokens = tokenizeSearch(normalizedQuery, { stripStopWords: true });

  if (!normalizedQuery || !relevantTokens.length) {
    return products;
  }

  return [...products]
    .map((product) => ({
      product,
      score: scoreProductMatch(product, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .map(({ product }) => product);
};


export const findBestProductMatch = (query, products = [], minimumScore = 70) => {
  const normalizedQuery = normalizeSearchText(query);
  const relevantTokens = tokenizeSearch(normalizedQuery, { stripStopWords: true });

  if (!normalizedQuery || !relevantTokens.length) {
    return null;
  }

  const bestMatch = [...products]
    .map((product) => ({
      product,
      score: scoreProductMatch(product, normalizedQuery),
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (!bestMatch || bestMatch.score < minimumScore) {
    return null;
  }

  return bestMatch.product;
};
