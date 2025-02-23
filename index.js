import express, { json } from "express";
import cors from "cors"; // Import cors

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing JSON dan CORS
app.use(cors({
  origin: "https://polaris.diveidolypapi.my.id", // Izinkan akses dari domain ini
  methods: "GET,POST,PUT,DELETE", // Izinkan metode HTTP tertentu
  credentials: true, // Izinkan pengiriman cookie atau header otentikasi
}));

app.use(json());

//  data
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
app.get("/api/stamps", (req, res) => {
  console.log("Mengakses /api/stamps");
  console.log("Mengakses /api/stamps dari", req.headers.origin);
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

// Endpoint untuk gambar stamp
app.get("/api/img/stamp/:imageCharacter/:imageExpression", (req, res) => {
  const { imageCharacter } = req.params;
  const { imageExpression } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/stampChat/stamp_${imageCharacter}-${imageExpression}.webp`;
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar icon character
app.get('/api/img/character/icon/:imageName', (req, res) => {
  const { imageName } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/iconCharacter/chara-${imageName}.png`;
  res.redirect(301, imageUrl); // 301: Permanent Redirect
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

// Mendapatkan data gambar group circle
app.get('/api/img/group/circle/:imageName', (req, res) => {
  const { imageName } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/idolGroup/group-${imageName}-circle.png`;
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar cosu card
app.get('/api/img/card/cosu/:chara/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/costumeIcon/cosu-${chara}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar figure card
app.get('/api/img/card/figureB/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/figureImageB/figure-${chara}-${initial}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar icon card
app.get('/api/img/card/thumb/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/iconImage/icon-${chara}-${initial}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar iconB card
app.get('/api/img/card/thumbB/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/iconImageB/icon-${chara}-${initial}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar iconE card
app.get('/api/img/card/thumbE/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/iconImageE/icon-${chara}-${initial}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar vertical card
app.get('/api/img/card/vertical/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/verticalImage/vertical-${chara}-${initial}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar verticalB card
app.get('/api/img/card/verticalB/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/verticalImageB/vertical-${chara}-${initial}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar verticalE card
app.get('/api/img/card/verticalE/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/verticalImageE/vertical-${chara}-${initial}-${cosuName}-${cosuIndex}.png`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar source card
app.get('/api/img/card/source/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/sourceImage/source-${chara}-${initial}-${cosuName}-${cosuIndex}-full.webp`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Mendapatkan data gambar sourceE card
app.get('/api/img/card/sourceE/:chara/:initial/:cosuName/:cosuIndex', (req, res) => {
  const { chara } = req.params;
  const { initial } = req.params;
  const { cosuName } = req.params;
  const { cosuIndex } = req.params;
  const imageUrl = `https://api.diveidolypapi.my.id/sourceImageE/source-${chara}-${initial}-${cosuName}-${cosuIndex}-full.webp`;
  
  res.redirect(301, imageUrl); // 301: Permanent Redirect
});

// Jalankan server (hanya lokal)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Ekspor app untuk Vercel
export default app;
