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
import bondStoryIndex from "./src/data/bondstory/index_bond.json" with { type: "json" };
import mainStoryIndex from "./src/data/mainstory/index_main.json" with { type: "json" };
import extraStoryIndex from "./src/data/extrastory/index_extra.json" with { type: "json" };
import wordleWords from "./src/data/wordle/words.json" with { type: "json" };
import gachaList from "./src/data/gacha/gachaList.json" with { type: "json" };
import diaryMana from "./src/data/diaryMana/diaryMana.json" with  { type: "json" };


const STORAGE_DIR = path.join(process.cwd(), "src/data/music");

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
      lovestory: "/api/lovestory/index.json", 
      bondstory: "/api/lovestory/index_bond.json", 
      musicRouter: "/api/music"
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
  const filePath = path.join(process.cwd(), "src/data/lovestory", `${safeId}.json`);

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


// --- Bond Story Endpoints (Dynamic File Reading) ---

// 1. Get Bond Story Index
app.get("/api/bondstory/index_bond.json", (_req, res) => {
  res.json(bondStoryIndex);
});

// 2. Get Bond Story Script Details
app.get("/api/bondstory/stories/:id.json", (req, res) => {
  const { id } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_]/g, ""); // Allow underscores for adv_bond_...
  const filePath = path.join(process.cwd(), "src/data/bondstory", `${safeId}.json`);

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

// --- Main Story Endpoints (Dynamic File Reading) ---

// 1. Get Main Story Index
app.get("/api/mainstory/index_main.json", (_req, res) => {
  res.json(mainStoryIndex);
});

// 2. Get Main Story Script Details
app.get("/api/mainstory/stories/:id.json", (req, res) => {
  const { id } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_]/g, ""); // Allow underscores for adv_main_...
  const filePath = path.join(process.cwd(), "src/data/mainstory", `${safeId}.json`);

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

// --- Extra Story Endpoints (Dynamic File Reading) ---

// 1. Get Extra Story Index
app.get("/api/extrastory/index_extra.json", (_req, res) => {
  res.json(extraStoryIndex);
});

// 2. Get Extra Story Script Details
app.get("/api/extrastory/stories/:id.json", (req, res) => {
  const { id } = req.params;
  const safeId = id.replace(/[^a-zA-Z0-9_]/g, ""); // Allow underscores for adv_extra_...
  const filePath = path.join(process.cwd(), "src/data/extrastory", `${safeId}.json`);

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

// 1. Get Mana's Diary Index
app.get("/api/manaDiary/diaryMana.json", (_req, res) => {
  res.json(diaryMana);
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

// 1. Ekstrak Tanggal (Tidak berubah, tetap gunakan yang tadi)
const parseGachaDate = (gacha) => {
  if (gacha.startAt) {
    const date = new Date(gacha.startAt);
    if (!isNaN(date.getTime())) return date.getTime();
  }
  const regexShort = /-(\d{2})-(\d{2})(\d{2})/;
  const matchShort = gacha.id.match(regexShort);
  if (matchShort) {
    const year = 2000 + parseInt(matchShort[1]);
    const month = parseInt(matchShort[2]) - 1; 
    const day = parseInt(matchShort[3]);
    return new Date(year, month, day).getTime();
  }
  const regexLong = /-(\d{4})-(\d{2})-(\d{2})/;
  const matchLong = gacha.id.match(regexLong);
  if (matchLong) {
    return new Date(matchLong[1], matchLong[2] - 1, matchLong[3]).getTime();
  }
  return 0; 
};

// 2. Tentukan Kategori Banner (FIXED & SAFER)
const getGachaCategory = (gacha) => {
  const name = (gacha.name || "").toLowerCase();
  const id = (gacha.id || "").toLowerCase();
  
  // AMBIL ID KARTU PERTAMA DENGAN AMAN
  // Jika array ada isinya, ambil elemen pertama. Jika tidak, string kosong.
  const firstCardId = (gacha.pickupCardIds && gacha.pickupCardIds.length > 0) 
    ? gacha.pickupCardIds[0].toLowerCase() 
    : "";

  const standardPollLength = (gacha.pickupCardIds && gacha.pickupCardIds.length === 1);

  // --- LOGIKA DETEKSI KATEGORI ---

  // 1. PREMIUM (Bayar pake uang asli / red diamond)
  if (name.includes("premium") || name.includes("プレミアム") || firstCardId.includes("prem")) return "Premium";

  // 2. KIZUNA / LINK (Karakter pasangan)
  // ID Kartu Kizuna biasanya mengandung 'link'
  if (name.includes("kizuna") || name.includes("絆") || firstCardId.includes("link")) return "Kizuna";

  // 3. BIRTHDAY
  // ID Kartu Birthday biasanya mengandung 'birt'
  if (name.includes("birthday") || name.includes("誕生日") || id.includes("birthday") || firstCardId.includes("birt")) return "Birthday";

  // 4. FES (Festival - Rate Up x2)
  // ID Kartu Fes biasanya mengandung 'fest'
  if (name.includes("フェス") && firstCardId.includes("fest")) return "Fest";

  // 5. RERUN / REVIVAL
  if (name.includes("rerun") || name.includes("復刻") || id.includes("rev")) return "Rerun";

  // 6. LIMITED (Event Gacha)
  // ID Gacha limited biasanya ada 'lm-' (Limited)
  if (id.includes("lm-") || name.includes("limited")) return "Limited";

  // 7. STANDARD / DIAMOND
  if (name.includes("★5アイドル\n1人確定ガチャ") && (standardPollLength)) return "Standard";
  if (name.includes("normal") || name.includes("ダイヤガチャ") || id.includes("normal")) return "Diamond";
  
  // Default fallback
  if (name.includes("pick up") || name.includes("ピックアップ")) return "Rate Up";
};

// ==========================================
// GACHA ENDPOINTS
// ==========================================

const getAllCardsFlat = () => {
  return cardSources.flatMap((source) =>
    source.data.map((card) => ({
      ...card,
      sourceName: source.name,
    }))
  );
};

// 1. LIST BANNER (Fixed Filter Logic)
app.get("/api/gachas", (_req, res) => {
    const list = gachaList
      .filter(g => {
          // Safety check
          if (!g.name) return false;
          
          // Ambil ID kartu pertama untuk pengecekan
          const firstCardId = (g.pickupCardIds && g.pickupCardIds.length > 0) 
            ? g.pickupCardIds[0].toLowerCase() 
            : "";

          // Filter Sampah
          if (g.name.includes("パック") || g.name.includes("Pack")) return false; 
          if (g.name.includes("Ticket") || g.name.includes("チケット")) return false; 
          if (g.id.includes("pickup") || g.name.includes("リリース記念\nガチャ")) return false; 
          if (g.id.includes("toy-buttonbadge")) return false;

          // Filter Kartu Event Reward (Biasanya kodenya 'eve')
          // Kartu event tidak ada di gacha, jadi banner yg isinya kartu 'eve' itu aneh/salah data
          if (firstCardId.includes("eve")) return false;

          // Hapus banner Premium dari daftar gacha
          if (getGachaCategory(g) === "Premium") return false;

          return true;
      })
      .map(g => {
          const timestamp = parseGachaDate(g);
          return {
              id: g.id,
              name: g.name,
              assetId: g.assetId || g.bannerAssetId, 
              startAt: timestamp > 0 ? new Date(timestamp).toISOString() : null, 
              // Panggil fungsi kategori dengan parameter 'g'
              category: getGachaCategory(g), 
              pickupCount: g.pickupCardIds ? g.pickupCardIds.length : 0
          };
      })
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

    // 1. SIAPKAN RATE UP CARDS
    const cleanPickupIds = (banner.pickupCardIds || []).map(pid => pid.replace(/^card-/, ""));
    
    const rateUpCards = allCards.filter(c => 
        banner.pickupCardIds?.includes(c.uniqueId) || cleanPickupIds.includes(c.uniqueId)
    );

    // --- ATURAN SPARK (EXCHANGE POINT) ---
    // Birthday & Kizuna = 100 Pt
    // Sisanya (Standard, Limited, Fes) = 200 Pt
    let exchangeLimit = 200;
    if (category === "Birthday" || category === "birt" || category === "Kizuna") {
        exchangeLimit = 100;
    }

    // 2. FILTER STANDARD POOL
    const standardPool = allCards.filter(c => {
        const uid = (c.uniqueId || "").toLowerCase();
        const costume = (c.costumeTheme || "").toLowerCase();

        // --- RULE 0: RATE UP (PRIORITAS TERTINGGI) ---
        // Jika kartu ini adalah Rate Up di banner ini, WAJIB MASUK.
        // Tidak peduli dia collab, event, limited, atau alien sekalipun.
        if (cleanPickupIds.includes(c.uniqueId)) return true;

        // --- RULE 1: FILTER COLLAB & EVENT (STRICT EXCLUDE) ---
        // Kartu Collab tidak boleh muncul di pool manapun kecuali dia Rate Up (sudah lolos di Rule 0).
        // Kita gunakan .includes() tanpa prefix '02-' agar menangkap semua variasi ID.
        const collabKeywords = ["miku", "goch", "sush", "kion", "trbl"];
        if (collabKeywords.some(keyword => uid.includes(keyword))) return false;

        // Filter Kartu Event Reward
        if (costume.includes("event")) return false;

        // Filter Tanggal
        const cardDate = new Date(c.releaseDate).getTime();
        if (cardDate > bannerDate) return false;

        // C. CEK TIPE KARTU
        const cardCat = (c.category || "").toLowerCase();
        
        const isFes = cardCat.includes("fest") || cardCat.includes("fes") || uid.includes("fes");
        const isKizuna = cardCat.includes("link") || cardCat.includes("kizuna") || uid.includes("link");
        const isBirthday = cardCat.includes("birthday") || uid.includes("birt");
        const isLimited = (cardCat.includes("limited") || uid.includes("lm-")) && !isFes && !isKizuna && !isBirthday;

        // --- ATURAN POOL BERDASARKAN KATEGORI ---

        if (isBirthday) return false; // Birthday orang lain jangan masuk

        // Kartu Fes hanya di Banner Fest
        if (isFes) return category === "Fest";

        // Kartu Kizuna hanya di Banner Kizuna & Fest
        if (isKizuna) return category === "Kizuna" || category === "Fest";

        // Kartu Limited di Banner Limited, Kizuna, Fest, Rate Up (tapi bukan Standard/Diamond)
        if (isLimited) {
            return category === "Limited" || category === "Kizuna" || category === "Fest" || category === "Rate Up";
        }

        // Standard Cards masuk semua
        return true;
    });

    res.json({
        bannerInfo: {
            id: banner.id,
            name: banner.name,
            assetId: banner.assetId || banner.bannerAssetId,
            startAt: new Date(bannerDate).toISOString(),
            category: category,
            exchangeLimit: exchangeLimit
        },
        rateUpCards: rateUpCards,
        pool: standardPool
    });
});

// ==========================================
// CHART MUSIC ENDPOINTS
// ==========================================

// 1. Endpoint: Get All Songs
// GET /api/music/songs
app.get('/api/music/songs', (req, res) => { 
    const filePath = path.join(STORAGE_DIR, "ProcessedSongList.json");
    
    // Cek file ada atau tidak
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Data not found. Run sync script first." });
    }
    
    res.sendFile(filePath);
});

// 2. Endpoint: Get Specific Chart
// GET /api/music/charts/:chartId
app.get('/api/music/charts/:chartId', (req, res) => {
    const chartId = req.params.chartId;
    
    // Validasi keamanan sederhana (mencegah directory traversal)
    if (!chartId || chartId.includes('..') || !chartId.startsWith('chart-')) {
        return res.status(400).json({ error: "Invalid Chart ID" });
    }

    const filePath = path.join(STORAGE_DIR, "charts", `${chartId}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Chart not found" });
    }

    res.sendFile(filePath);
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