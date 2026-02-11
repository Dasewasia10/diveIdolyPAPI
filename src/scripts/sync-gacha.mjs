import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, "../data/gacha");

// URL GitHub MalitsPlus (Master Data)
const BASE_URL =  "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
const GACHA_URL = `${BASE_URL}/Gacha.json`;

// Pastikan folder output ada
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper Fetch
const fetchData = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
      res.on("error", reject);
    });
  });
};

const syncGacha = async () => {
  console.log("⏳ Fetching Gacha Data from MalitsPlus...");

  try {
    const rawGachas = await fetchData(GACHA_URL);
    
    // Filter Gacha yang relevan
    // gachaType biasanya: 1 (Permanent), 2 (Limited/Pickup), 
    // Kita hindari tipe '6' atau semacamnya yang biasanya cuma item pack/guaranteed ticket
    // Tapi untuk aman, kita filter yang punya 'pickupCardIds' atau yang namanya jelas
    
    const processedGachas = rawGachas
      .filter(g => {
         // Filter kasar: Harus punya nama, dan bukan gacha item murni
         // Kita bisa sesuaikan filter ini nanti jika masih ada sampah
         return g.name && !g.name.includes("パック") && !g.name.includes("Ticket");
      })
      .map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        assetId: g.assetId, // Untuk gambar banner
        startAt: g.startAt, // PENTING: Tanggal Mulai
        endAt: g.endAt,
        type: g.gachaType,
        pickupCardIds: g.pickupCardIds || [], // ID Kartu yang Rate Up
        // Kita simpan info penting saja untuk menghemat size
      }))
      // Urutkan dari yang terbaru ke terlama (agar mudah dilihat di UI)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "gachaList.json"), 
      JSON.stringify(processedGachas, null, 2)
    );

    console.log(`✅ Berhasil menyimpan ${processedGachas.length} Banner Gacha!`);

  } catch (error) {
    console.error("❌ Gagal sync Gacha:", error);
  }
};

syncGacha();