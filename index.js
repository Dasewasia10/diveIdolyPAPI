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
import gachaList from "./src/data/gacha/gachaList.json" with { type: "json" };

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

app.get("/api/wordle/daily", (req, res) => {
  let dayIndex;

  // 1. Cek apakah Client mengirimkan index hari lokal mereka
  if (req.query.day) {
    dayIndex = parseInt(req.query.day);
  } else {
    // Fallback: Jika tidak ada param, pakai waktu Server (UTC)
    const now = new Date();
    dayIndex = Math.floor(now.getTime() / 86400000);
  }
  
  // 2. Pilih kata berdasarkan index hari
  // Menggunakan Math.abs untuk mencegah error jika user mengotak-atik tanggal jadi minus
  const wordIndex = Math.abs(dayIndex) % wordleWords.length;
  const word = wordleWords[wordIndex].toUpperCase();

  // 3. Kirim ke frontend
  const encodedWord = Buffer.from(word).toString('base64');

  res.json({
    dayIndex: dayIndex, // Kirim balik ID harinya untuk validasi di frontend
    length: word.length,
    hash: encodedWord
  });
});

// ==========================================
// GACHA DATA ENDPOINTS
// ==========================================

// 1. Ekstrak Tanggal dari ID jika startAt error
// Format umum ID: gacha-name-YY-MMDD atau gacha-name-YYYY-MM-DD
const parseGachaDate = (gacha) => {
  // Prioritas 1: Gunakan startAt jika valid
  if (gacha.startAt) {
    const date = new Date(gacha.startAt);
    if (!isNaN(date.getTime())) return date.getTime();
  }

  // Prioritas 2: Regex ID (Format YY-MMDD) -> Contoh: 21-0813
  const regexShort = /-(\d{2})-(\d{2})(\d{2})/;
  const matchShort = gacha.id.match(regexShort);
  if (matchShort) {
    const year = 2000 + parseInt(matchShort[1]);
    const month = parseInt(matchShort[2]) - 1; // JS Month 0-11
    const day = parseInt(matchShort[3]);
    return new Date(year, month, day).getTime();
  }

  // Prioritas 3: Regex ID (Format YYYY-MM-DD)
  const regexLong = /-(\d{4})-(\d{2})-(\d{2})/;
  const matchLong = gacha.id.match(regexLong);
  if (matchLong) {
    return new Date(matchLong[1], matchLong[2] - 1, matchLong[3]).getTime();
  }

  return 0; // Gagal parse (biasanya banner permanen tanpa tanggal spesifik)
};

// 2. Tentukan Kategori Banner
const getGachaCategory = (gacha) => {
  const name = (gacha.name || "").toLowerCase();
  const id = (gacha.id || "").toLowerCase();

  // Urutan pengecekan penting!
  if (name.includes("premium") || name.includes("プレミアム")) return "Premium";
  if (name.includes("birthday") || name.includes("誕生日") || id.includes("birthday")) return "Birthday";
  if (name.includes("fest") || name.includes("フェス") || id.includes("fes")) return "Fest";
  if (name.includes("kizuna") || name.includes("絆")) return "Kizuna";
  if (name.includes("normal") || name.includes("ダイヤガチャ") || id.includes("normal")) return "Diamond";
  if (name.includes("rerun") || name.includes("復刻") || id.includes("rev")) return "Rerun";
  
  // Default logic gachaType MalitsPlus (Type 1 usually perm, 2 limited)
  // Tapi nama lebih akurat biasanya.
  if (name.includes("pick up") || name.includes("ピックアップ")) return "Rate Up";
  
  return "Standard";
};

// ==========================================
// GACHA ENDPOINTS
// ==========================================

// 1. LIST BANNER (Dengan Tanggal yang Benar)
app.get("/api/gachas", (_req, res) => {
    const list = gachaList
      .filter(g => {
          // Buang banner sampah (Ticket, Item Pack, Button Badge, dll)
          if (!g.name) return false;
          if (g.name.includes("パック") || g.name.includes("Pack")) return false; // Pack Item
          if (g.name.includes("Ticket") || g.name.includes("チケット")) return false; // Ticket Only
          if (g.id.includes("pickup") || g.name.includes("リリース記念\nガチャ")) return false; // Promo Pickup Gacha
          if (g.id.includes("toy-buttonbadge")) return false;
          return true;
      })
      .map(g => {
          const timestamp = parseGachaDate(g);
          return {
              id: g.id,
              name: g.name,
              assetId: g.assetId || g.bannerAssetId, // Fallback field
              startAt: timestamp > 0 ? new Date(timestamp).toISOString() : null, // Kirim ISO String
              category: getGachaCategory(g),
              pickupCount: g.pickupCardIds ? g.pickupCardIds.length : 0
          };
      })
      // Urutkan: Terbaru di atas
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    res.json(list);
});

// 2. GACHA POOL SIMULATION
app.get("/api/gachas/:id/pool", (req, res) => {
    const { id } = req.params;
    const banner = gachaList.find(g => g.id === id);

    if (!banner) return res.status(404).json({ error: "Banner not found" });

    const allCards = getAllCardsFlat();
    const bannerDate = parseGachaDate(banner);
    const category = getGachaCategory(banner);

    // A. RATE UP CARDS
    const cleanPickupIds = (banner.pickupCardIds || []).map(pid => pid.replace(/^card-/, ""));
    const rateUpCards = allCards.filter(c => 
        banner.pickupCardIds?.includes(c.uniqueId) || cleanPickupIds.includes(c.uniqueId)
    );

    // B. STANDARD POOL LOGIC
    const standardPool = allCards.filter(c => {
        // 1. FILTER: Kartu Event tidak masuk Gacha
        // Cek field 'category' di cardSources atau 'obtainMessage' jika ada indikasi event
        if (c.costumeTheme && c.costumeTheme.toLowerCase().includes("event")) return false;

        // 2. FILTER: Tanggal Rilis (Time Travel)
        // Kartu harus rilis SEBELUM atau SAMA DENGAN banner
        const cardDate = new Date(c.releaseDate).getTime();
        if (cardDate > bannerDate) return false;

        // 3. FILTER: Limited/Fes
        // Jika banner ini ADALAH Fes, maka kartu Fes lama BOLEH masuk (biasanya).
        // Jika banner Standard, kartu Fes/Limited TIDAK boleh masuk.
        const isCardLimited = c.category && (c.category.toLowerCase().includes("limited") || c.category.toLowerCase().includes("fest"));
        const isCardRateUp = cleanPickupIds.includes(c.uniqueId);

        // Jika kartu ini Rate Up, loloskan apapun statusnya
        if (isCardRateUp) return true;

        // Jika kartu ini Limited/Fes TAPI tidak Rate Up, cek jenis bannernya
        if (isCardLimited) {
            // Logika Idoly Pride: Fes Banner biasanya berisi kartu Fes lama, tapi Limited Banner tidak berisi Limited lama.
            if (category === "Fest" && c.category.toLowerCase().includes("fest")) return true;
            return false; // Buang Limited/Fes nyasar
        }

        return true; // Kartu Permanent lolos
    });

    res.json({
        bannerInfo: {
            id: banner.id,
            name: banner.name,
            assetId: banner.assetId || banner.bannerAssetId,
            startAt: new Date(bannerDate).toISOString(),
            category: category
        },
        rateUpCards: rateUpCards,
        pool: standardPool
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