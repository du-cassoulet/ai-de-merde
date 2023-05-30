import Stopwords from "./stopwords.js";
import langs from "./langs.js";

/**
 * @param {string} string1
 * @param {string} string2
 */
function jaroWinklerSimilarity(string1, string2) {
  if (string1.length > string2.length) {
    [string1, string2] = [string2, string1];
  }

  const matching = Math.floor(string2.length / 2) - 1;
  const string1Array = Array.from(string1.length).fill(false);
  const string2Array = Array.from(string2.length).fill(false);
  let matchingCharacters = 0;

  for (let i = 0; i < string1.length; i++) {
    const start = Math.max(0, i - matching);
    const end = Math.min(i + matching + 1, string2.length);

    for (let j = start; j < end; j++) {
      if (string1[i] === string2[j] && !string2Array[j]) {
        string1Array[i] = true;
        string2Array[j] = true;
        matchingCharacters++;
        break;
      }
    }
  }

  if (matchingCharacters === 0) return 0;

  let transpositions = 0;
  let k = 0;

  for (let i = 0; i < string1.length; i++) {
    if (string1Array[i]) {
      while (!string2Array[k]) {
        k++;
      }

      if (string1[i] !== string2[k]) {
        transpositions++;
      }

      k++;
    }
  }

  const jaroSimilarity =
    (matchingCharacters / string1.length +
      matchingCharacters / string2.length +
      (matchingCharacters - transpositions / 2) / matchingCharacters) /
    3;

  let prefixLength = 0;
  let maxPrefixLength = Math.min(4, string1.length);

  for (let i = 0; i < maxPrefixLength; i++) {
    if (string1[i] !== string2[i]) break;
    prefixLength++;
  }

  return jaroSimilarity + prefixLength * 0.1 * (1 - jaroSimilarity);
}

/**
 * @param {string} s
 */
function normalized(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * @param {string} s
 */
function clean(s) {
  return normalized(s).replace(/[^a-z0-9\s!?.]/g, "");
}

/**
 * @param {string} text
 */
function removeStopwords(text) {
  const words = clean(text).split(/\s+/);

  /** @type {string[][]} */
  const lists = [];

  langs.forEach((lang) => {
    const list = Stopwords.removeStopwords(words, Stopwords[lang]);
    lists.push(list);
  });

  return lists.sort((a, b) => a.length - b.length)[0].join(" ");
}

const data = JSON.parse(localStorage.getItem("data") || "{}");
const promptForm = document.getElementById("prompt-form");
const promptInput = document.getElementById("prompt");
const answerElement = document.getElementById("answer");

let trainMessage = "";

/**
 * @param {string} question
 * @param {string} answer
 */
function train(question, answer) {
  if (question === "") {
    const cleanStr = removeStopwords(answer);
    data[cleanStr] = [];

    return localStorage.setItem("data", JSON.stringify(data));
  }

  /** @type {Object.<string, string[]>} */
  const cleanStr = removeStopwords(question);

  /** @type {Object.<string, string[]>} */
  const cleanAnswer = removeStopwords(answer);

  if (data[cleanStr] === undefined) {
    data[cleanAnswer] = [];
  }

  if (data[cleanStr] !== undefined) {
    data[cleanStr].push(answer);
  } else {
    data[cleanStr] = [answer];
  }

  localStorage.setItem("data", JSON.stringify(data));
}

promptForm.onsubmit = (e) => {
  e.preventDefault();

  const prompt = promptInput.value;
  const keys = Object.entries(data)
    .filter(({ 1: value }) => value.length > 0)
    .map(([key]) => key);

  const key = keys
    .map((key) => ({
      val: key,
      sim: jaroWinklerSimilarity(removeStopwords(prompt), key),
    }))
    .sort((a, b) => b.sim - a.sim)[0].val;

  const answers = data[key];
  const randomAnswer = answers[Math.floor(Math.random() * answers.length)];

  promptInput.value = "";
  answerElement.textContent = randomAnswer;

  train(trainMessage, prompt);
  trainMessage = randomAnswer;
};
