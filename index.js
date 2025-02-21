import express, { json } from "express";
import cors from "cors"; // Import cors

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing JSON dan CORS
app.use(json());
app.use(cors({
  origin: "https://idoly-polaris.vercel.app", // Izinkan akses dari domain ini
  methods: "GET,POST,PUT,DELETE", // Izinkan metode HTTP tertentu
  credentials: true, // Izinkan pengiriman cookie atau header otentikasi
}));

// Contoh data
import cardSources from "./src/data/card/cardSources.json" with { type: "json" };
import qnaSources from "./src/data/qna/qnaSources.json" with { type: "json" };
import lyricSources from "./src/data/lyrics/lyricsData.json" with { type: "json" };
import characterSources from "./src/data/character/character.json" with { type: "json" };
import stampSources from "./src/data/stamps/stamps.json" with { type: "json" };

// Middleware untuk parsing JSON
app.use(json());

app.use((req, res, next) => {
  console.log("CORS Middleware aktif untuk:", req.path);
  next();
});

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to DiveIdolyPAPI API!",
    endpoints: {
      cards: "/api/cards",
      qnas: "/api/qnas",
      lyrics: "/api/lyrics",
      characters: "/api/characters",
      stamps: "/api/stamps",
    },
  });
});

// Endpoint untuk semua kartu
app.get("/api/cards", (_req, res) => {
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
app.get("/api/qnas", (_req, res) => {
  res.json(qnaSources);
});

// Endpoint untuk QnA berdasarkan nama karakter
app.get("/api/qnas/:name", (req, res) => {
  const source = qnaSources.find(
    (source) => source.name.toLowerCase() === req.params.name.toLowerCase()
  );
  source
    ? res.json(source.data)
    : res.status(404).json({ error: "Character not found" });
});

// Endpoint untuk semua lirik lagu
app.get("/api/lyrics", (_req, res) => {
  res.json(lyricSources);
});

// Endpoint untuk lirik berdasarkan judul
app.get("/api/lyrics/:name", (req, res) => {
  const source = lyricSources.find(
    (source) => source.name.toLowerCase() === req.params.name.toLowerCase()
  );
  source
    ? res.json(source.data)
    : res.status(404).json({ error: "Lyric not found" });
});

// Endpoint untuk semua karakter
app.get("/api/characters", (_req, res) => {
  res.json(characterSources);
});

// Endpoint untuk nama karakter tertentu
app.get("/api/characters/:name", (req, res) => {
  const source = characterSources.find(
    (source) => source.name.toLowerCase() === req.params.name.toLowerCase()
  );
  source
    ? res.json(source)
    : res.status(404).json({ error: "Character not found" });
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

// Endpoint untuk semua stamp
app.get("/api/stamps", (_req, res) => {
  console.log("Mengakses /api/stamps");
  res.json(stampSources);
});

// Endpoint untuk stamp berdasarkan maskot
app.get("/api/stamps/:name", (req, res) => {
  const source = stampSources.find(
    (source) => source.character.toLowerCase() === req.params.name.toLowerCase()
  );
  source
    ? res.json(source.data)
    : res.status(404).json({ error: "Stamp not found" });
});

// Jalankan server (hanya lokal)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Ekspor app untuk Vercel
export default app;
