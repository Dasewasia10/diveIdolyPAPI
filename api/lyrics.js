const { readFileSync } = require("fs");
const path = require("path");

function loadData(filePath) {
  return JSON.parse(
    readFileSync(path.join(__dirname, "../src/data", filePath), "utf-8")
  );
}

const lyricSources = loadData("lyrics/lyricsData.json");

module.exports = (req, res) => {
  res.json(lyricSources);
};
