const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

// Middleware untuk parsing JSON
app.use(express.json());

// Fungsi untuk membaca JSON dari file
const readJson = (filePath) => {
  return JSON.parse(fs.readFileSync(path.join(__dirname, filePath), "utf-8"));
};

// Load data dari JSON files
const cardSources = readJson("src/data/card/cardSources.json");
const qnaSources = readJson("src/data/qna/qnaSources.json");
const lyricSources = readJson("src/data/lyrics/lyricsData.json");
const characterSources = readJson("src/data/character/character.json");

// Endpoint utama
app.get("/", (req, res) => {
  res.json({ message: "Welcome to DiveIdolyPAPI API!" });
});

// Endpoint untuk semua kartu
app.get("/cards", (req, res) => {
  res.json(cardSources);
});

// Endpoint untuk kartu berdasarkan nama karakter
app.get("/cards/:name", (req, res) => {
  const name = req.params.name.toLowerCase();
  const matchedCards = cardSources.filter(
    (source) => source.name.toLowerCase() === name
  );
  if (matchedCards.length) {
    res.json(matchedCards.map((source) => source.data));
  } else {
    res.status(404).json({ error: "Character not found" });
  }
});

// Endpoint untuk semua QnA
app.get("/qnas", (req, res) => {
  res.json(qnaSources);
});

// Endpoint untuk QnA berdasarkan nama karakter
app.get("/qnas/:name", (req, res) => {
  const source = qnaSources.find(
    (source) => source.name.toLowerCase() === req.params.name.toLowerCase()
  );
  source
    ? res.json(source.data)
    : res.status(404).json({ error: "Character not found" });
});

// Endpoint untuk semua lirik
app.get("/lyrics", (req, res) => {
  res.json(lyricSources);
});

// Endpoint untuk lirik berdasarkan nama karakter
app.get("/lyrics/:name", (req, res) => {
  const source = lyricSources.find(
    (source) => source.name.toLowerCase() === req.params.name.toLowerCase()
  );
  source
    ? res.json(source.data)
    : res.status(404).json({ error: "Lyric not found" });
});

// Endpoint untuk semua karakter
app.get("/characters", (req, res) => {
  res.json(characterSources);
});

// Endpoint untuk karakter berdasarkan nama
app.get("/characters/:name", (req, res) => {
  const source = characterSources.find(
    (source) => source.name.toLowerCase() === req.params.name.toLowerCase()
  );
  source
    ? res.json(source)
    : res.status(404).json({ error: "Character not found" });
});

// Endpoint untuk karakter berdasarkan grup
app.get("/characters/group/:groupName", (req, res) => {
  const groupName = req.params.groupName.toLowerCase().replace(/\s+/g, "");
  const matchedCharacters = characterSources.filter(
    (source) => source.groupName.toLowerCase().replace(/\s+/g, "") === groupName
  );
  matchedCharacters.length
    ? res.json(matchedCharacters)
    : res.status(404).json({ error: "Character not found" });
});

// Jalankan server di port yang diberikan oleh Vercel atau 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Export handler untuk Vercel
module.exports = app;
