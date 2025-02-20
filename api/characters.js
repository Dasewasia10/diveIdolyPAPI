const { readFileSync } = require("fs");
const path = require("path");

function loadData(filePath) {
  return JSON.parse(
    readFileSync(path.join(__dirname, "../src/data", filePath), "utf-8")
  );
}

const characterSources = loadData("character/character.json");

module.exports = (req, res) => {
  res.json(characterSources);
};
