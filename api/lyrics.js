import { readFileSync } from "fs";
import { join } from "path";

function loadData(filePath) {
  return JSON.parse(
    readFileSync(join(__dirname, "../src/data", filePath), "utf-8")
  );
}

const lyricSources = loadData("lyrics/lyricsData.json");

export default (req, res) => {
  res.json(lyricSources);
};
