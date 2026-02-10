import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. DATA IMPORTS
// ==========================================
import cardSources from "./src/data/card/cardSources.json" with { type: "json" };
import qnaSources from "./src/data/qna/qnaSources.json" with { type: "json" };
import lyricSources from "./src/data/lyrics/lyricsData.json" with { type: "json" };
import characterSources from "./src/data/character/character.json" with { type: "json" };
import stampSources from "./src/data/stamps/stamps.json" with { type: "json" };
import messageIndex from "./src/data/messages/index.json" with { type: "json" };
import loveStoryIndex from "./src/data/lovestory/index.json" with { type: "json" };
import wordleWords from "./src/data/wordle/words.json" with { type: "json" };

import banners from "./src/data/gacha/banners.json" with { type: "json" };

// ==========================================
// 2. MIDDLEWARE CONFIGURATION
// ==========================================

const allowedOrigins = [
  "https://polaris.diveidolypapi.my.id",
  "https://polaris.diveidolypapi.my.id/",
  "http://localhost:5173" // [NOTE]: Kept for local development testing
];

app.use(cors({
  origin: allowedOrigins,
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type",
  credentials: true,
}));

// Middleware for parsing JSON body
app.use(express.json());

// ==========================================
// 3. API ROUTES
// ==========================================

// --- Root Endpoint ---
app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to DiveIdolyPAPI API!",
    endpoints: {
      cards: "/api/cards",
      qnas: "/api/qnas",
      lyrics: "/api/lyrics",
      characters: "/api/characters",
      stamps: "/api/stamps",
      messages: "/api/messages/index.json",
      lovestory: "/api/lovestory/index.json" // New Endpoint
    },
  });
});

// --- Card Endpoints ---
app.get("/api/cards", (_req, res) => {
  res.json(cardSources);
});

app.get("/api/cards/:name", (req, res) => {
  const { name } = req.params;
  const filteredCards = cardSources.filter((card) =>
    card.name.toLowerCase().includes(name.toLowerCase())
  );

  if (filteredCards.length > 0) {
    res.json(filteredCards);
  } else {
    res.status(404).json({ error: "Character cards not found" });
  }
});

// --- QnA Endpoints ---
app.get("/api/qnas", (_req, res) => {
  res.json(qnaSources);
});

app.get("/api/qnas/:name", (req, res) => {
  const { name } = req.params;
  const filteredQnas = qnaSources.filter((qna) =>
    qna.name.toLowerCase().includes(name.toLowerCase())
  );

  if (filteredQnas.length > 0) {
    res.json(filteredQnas);
  } else {
    res.status(404).json({ error: "Character QnA not found" });
  }
});

// --- Lyrics Endpoints ---
app.get("/api/lyrics", (_req, res) => {
  res.json(lyricSources);
});

app.get("/api/lyrics/:name", (req, res) => {
  const { name } = req.params;
  const filteredLyrics = lyricSources.filter((lyric) =>
    lyric.songName.toLowerCase().includes(name.toLowerCase())
  );

  if (filteredLyrics.length > 0) {
    res.json(filteredLyrics);
  } else {
    res.status(404).json({ error: "Lyrics not found" });
  }
});

// --- Character Endpoints ---
app.get("/api/characters", (_req, res) => {
  res.json(characterSources);
});

app.get("/api/characters/:name", (req, res) => {
  const { name } = req.params;
  const character = characterSources.find(
    (char) => char.name.toLowerCase() === name.toLowerCase()
  );

  if (character) {
    res.json(character);
  } else {
    res.status(404).json({ error: "Character not found" });
  }
});

app.get("/api/characters/group/:groupName", (req, res) => {
  const { groupName } = req.params;
  const characters = characterSources.filter(
    (char) => char.group.toLowerCase() === groupName.toLowerCase()
  );

  if (characters.length > 0) {
    res.json(characters);
  } else {
    res.status(404).json({ error: "Group not found" });
  }
});

// --- Stamp Endpoints ---
app.get("/api/stamps", (_req, res) => {
  res.json(stampSources);
});

app.get("/api/img/stamps/:imageCharacter/:imageExpression", async (req, res) => {
  const { imageCharacter } = req.params;
  const { imageExpression } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/stampChat/stamp_${imageCharacter}-${imageExpression}.webp`;
  
  // Tambahkan CORS headers sebelum redirect
  res.set({
    "Access-Control-Allow-Origin": "*",
    'Access-Control-Allow-Methods': 'GET'
  });
  res.redirect(301, imageUrl);
});

// -- Image of character details ===
// Mendapatkan data gambar icon character
app.get('/api/img/character/icon/:imageName', async (req, res) => {
  const { imageName } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/iconCharacter/chara-${imageName}.png`;
  
  // Tambahkan CORS headers sebelum redirect
  res.set({
    "Access-Control-Allow-Origin": "*",
    'Access-Control-Allow-Methods': 'GET'
  });
  res.redirect(301, imageUrl);
});

// Mendapatkan data gambar banner character
app.get('/api/img/character/banner/:imageName', (req, res) => {
  const { imageName } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/bannerCharacter/banner-${imageName}.png`;
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar sprite1 character
app.get('/api/img/character/sprite1/:imageName', (req, res) => {
  const { imageName } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/spriteCharacter/sprite-${imageName}-01.png`;
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar sprite2 character
app.get('/api/img/character/sprite2/:imageName', (req, res) => {
  const { imageName } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/spriteCharacter/sprite-${imageName}-02.png`;
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// --- Message System Endpoints (Dynamic File Reading) ---

// 1. Get Message Index
app.get("/api/messages/index.json", (_req, res) => {
  res.json(messageIndex);
});

// 2. Get Message Details
app.get("/api/messages/detail/:id.json", (req, res) => {
  const { id } = req.params;
  
  // [SUGGESTION]: Always sanitize input when using file system operations
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, ""); 
  const filePath = path.join(process.cwd(), "src/data/messages/detail", `${safeId}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(fileContent);
      res.json(data);
    } else {
      res.status(404).json({ error: "Message detail not found" });
    }
  } catch (error) {
    console.error("Error reading message file:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Love Story Endpoints (Dynamic File Reading) ---

// 1. Get Love Story Index
app.get("/api/lovestory/index.json", (_req, res) => {
  res.json(loveStoryIndex);
});

// 2. Get Love Story Script Details
app.get("/api/lovestory/stories/:id.json", (req, res) => {
  const { id } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_]/g, ""); // Allow underscores for adv_love_...
  const filePath = path.join(process.cwd(), "src/data/lovestory/stories", `${safeId}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(fileContent);
      res.json(data);
    } else {
      res.status(404).json({ error: "Story script not found" });
    }
  } catch (error) {
    console.error("Error reading story file:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==========================================
// IDOLY WORDLE ENDPOINT
// ==========================================

app.get("/api/wordle/daily", (_req, res) => {
  // 1. Hitung hari ke-berapa sejak Epoch (UTC)
  // 86400000 ms = 1 hari
  const now = new Date();
  // Gunakan offset waktu Jepang/Indonesia jika mau, tapi UTC lebih standar
  const dayIndex = Math.floor(now.getTime() / 86400000); 
  
  // 2. Pilih kata berdasarkan index hari (Looping jika array habis)
  const wordIndex = dayIndex % wordleWords.length;
  const word = wordleWords[wordIndex].toUpperCase();

  // 3. Kirim ke frontend
  // Kita encode Base64 sederhana agar tidak terbaca langsung di Network tab browser (biar gak gampang nyontek)
  const encodedWord = Buffer.from(word).toString('base64');

  res.json({
    date: new Date().toISOString().split('T')[0], // Tanggal hari ini
    length: word.length, // Panjang kata (untuk bikin grid)
    hash: encodedWord // Kata yang di-encode
  });
});

// ==========================================
// GACHA SYSTEM
// ==========================================

// 1. Get Active Banners
app.get("/api/gacha/banners", (_req, res) => {
  res.json(banners);
});

// 2. Perform Gacha Pull
app.post("/api/gacha/pull", (req, res) => {
  const { bannerId, amount } = req.body; // amount: 1 or 10
  
  const banner = banners.find(b => b.id === bannerId);
  if (!banner) return res.status(404).json({ error: "Banner not found" });

  const results = [];
  
  // Pisahkan kolam kartu (Card Pools)
  // Asumsi: cardSources punya properti 'rarity' (integer 3, 4, 5)
  const pool5 = cardSources.filter(c => c.rarity === 5);
  const pool4 = cardSources.filter(c => c.rarity === 4);
  const pool3 = cardSources.filter(c => c.rarity === 3); // Jika tidak ada data 3*, buat dummy

  // Rate Config
  const rate5 = banner.rates["5"];
  const rate4 = banner.rates["4"];
  // Rate 3 adalah sisanya

  for (let i = 0; i < amount; i++) {
    const rng = Math.random(); // 0.0 - 1.0
    let rarity = 3;
    let selectedCard = null;

    // LOGIC: Guaranteed 4* on 10th pull (jika i === 9 dan amount === 10)
    // Tapi di Idoly Pride, guaranteed slot itu 4* OR 5*.
    // Jadi logicnya: Roll 5* dulu, kalau gagal baru paksa 4*.
    const isGuaranteedSlot = (amount === 10 && i === 9);

    if (rng < rate5) {
      // --- DAPAT 5 STAR ---
      rarity = 5;
      
      // Cek Pickup (50% chance kalau rate up standard)
      const isPickup = Math.random() < 0.5; 
      if (isPickup && banner.pickupIds.length > 0) {
          // Ambil dari list pickup
          const pickupId = banner.pickupIds[Math.floor(Math.random() * banner.pickupIds.length)];
          selectedCard = cardSources.find(c => c.id === pickupId) || pool5[0];
      } else {
          // Spook (Acak dari pool 5)
          selectedCard = pool5[Math.floor(Math.random() * pool5.length)];
      }

    } else if (rng < rate5 + rate4 || isGuaranteedSlot) {
      // --- DAPAT 4 STAR ---
      rarity = 4;
      selectedCard = pool4[Math.floor(Math.random() * pool4.length)];
      
      // Fallback jika data 4* kosong
      if (!selectedCard) selectedCard = { id: "dummy_4", name: "Generic 4 Star", rarity: 4 };

    } else {
      // --- DAPAT 3 STAR ---
      rarity = 3;
      selectedCard = pool3[Math.floor(Math.random() * pool3.length)];
      
      // Fallback jika data 3* kosong (biasanya foto manager/mob)
      if (!selectedCard) selectedCard = { id: "dummy_3", name: "Generic 3 Star", rarity: 3 };
    }

    // Tambahkan properti isNew nanti di frontend (localStorage check)
    results.push(selectedCard);
  }

  res.json({
    results: results,
    bannerId: bannerId
  });
});

// ==========================================
// 4. UTILITY ENDPOINTS
// ==========================================

// --- Image Proxy ---
// [NOTE]: This proxy fetches external images and serves them with CORS headers
app.get('/api/proxy/image', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        // [SUGGESTION]: Hardcoding the origin here might limit the proxy if you change domains.
        // It's generally safer to just forward the request or use a generic User-Agent.
        'Origin': 'https://polaris.diveidolypapi.my.id' 
      }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer(); // [NOTE]: changed .buffer() to .arrayBuffer() for standard Fetch API
    const nodeBuffer = Buffer.from(buffer);

    res.set({
      'Access-Control-Allow-Origin': '*',
      'Content-Type': contentType || 'image/png',
      'Cache-Control': 'public, max-age=86400'
    });
    
    res.send(nodeBuffer);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// ==========================================
// 5. SERVER START
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;