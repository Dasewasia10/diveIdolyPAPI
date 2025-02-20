// index.js
import express, { json } from "express";
import { readFileSync } from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

// Contoh data

const cardSources = JSON.parse(
  readFileSync(
    new URL("../src/data/card/cardSources.json", import.meta.url),
    "utf8"
  )
);
const qnaSources = JSON.parse(
  readFileSync(
    new URL("../src/data/qna/qnaSources.json", import.meta.url),
    "utf8"
  )
);
const lyricSources = JSON.parse(
  readFileSync(
    new URL("../src/data/lyrics/lyricsData.json", import.meta.url),
    "utf8"
  )
);
const characterSources = JSON.parse(
  readFileSync(
    new URL("../src/data/character/character.json", import.meta.url),
    "utf8"
  )
);

// Middleware untuk parsing JSON
app.use(json());

app.get("/api", (req, res) => {
  res.json({
    message: "Welcome to DiveIdolyPAPI API!",
    endpoints: {
      cards: "/api/cards",
      qnas: "/api/qnas",
      lyrics: "/api/lyrics",
      characters: "/api/characters",
    },
  });
});

// Endpoint untuk semua kartu
app.get("/api/cards", (req, res) => {
  res.json(cardSources);
});

// Endpoint untuk kartu berdasarkan nama karakter
app.get("/api/cards/:name", (req, res) => {
  const { name } = req.params;
  const filteredCards = cardSources.filter(
    (card) => card.name.toLowerCase() === name.toLowerCase()
  );

  if (filteredCards.length > 0) {
    res.json(filteredCards);
  } else {
    res.status(404).json({ error: "Character not found" });
  }
});

// Endpoint untuk semua QnA
app.get("/api/qnas", (req, res) => {
  res.json(qnaSources);
});

// Endpoint untuk semua lirik lagu
app.get("/api/lyrics", (req, res) => {
  res.json(lyricSources);
});

// Endpoint untuk semua karakter
app.get("/api/characters", (req, res) => {
  res.json(characterSources);
});

// Endpoint untuk karakter berdasarkan grup
app.get("/api/characters/group/:groupName", (req, res) => {
  const { groupName } = req.params;
  const matchedCharacters = _filter(
    (character) =>
      character.groupName.toLowerCase().replace(/\s/g, "") ===
      groupName.toLowerCase().replace(/\s/g, "")
  );

  if (matchedCharacters.length > 0) {
    res.json(matchedCharacters);
  } else {
    res.status(404).json({ error: "Group not found" });
  }
});

// Jalankan server (hanya lokal)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Ekspor app untuk Vercel
export default app;
