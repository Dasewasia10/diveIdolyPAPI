const { readFileSync } = require("fs");
const path = require("path");

function loadData(filePath) {
  return JSON.parse(
    readFileSync(path.join(__dirname, "../src/data", filePath), "utf-8")
  );
}

const cardSources = loadData("card/cardSources.json");

module.exports = (req, res) => {
  res.json(cardSources);
};
