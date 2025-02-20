const { readFileSync } = require("fs");
const path = require("path");

function loadData(filePath) {
  return JSON.parse(
    readFileSync(path.join(__dirname, "../src/data", filePath), "utf-8")
  );
}

const qnaSources = loadData("qna/qnaSources.json");

module.exports = (req, res) => {
  res.json(qnaSources);
};
