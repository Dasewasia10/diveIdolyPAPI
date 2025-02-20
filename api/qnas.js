import { readFileSync } from "fs";
import { join } from "path";

function loadData(filePath) {
  return JSON.parse(
    readFileSync(join(__dirname, "../src/data", filePath), "utf-8")
  );
}

const qnaSources = loadData("qna/qnaSources.json");

export default (req, res) => {
  res.json(qnaSources);
};
