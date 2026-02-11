import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// --- KONFIGURASI ---
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
const TARGET_FILES = ["Music.json", "MusicChartPattern.json", "Quest.json"];
const DATA_DIR = path.join(__dirname, "../data/music"); // Sesuaikan folder penyimpananmu

// Interface Sederhana untuk Mapping (Opsional)
interface SongMap {
  id: string;
  title: string;
  assetId: string;
  charts: string[]; // List Chart ID yang tersedia
}

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

async function fetchAndSave(fileName: string) {
  console.log(`⏳ Downloading ${fileName}...`);
  try {
    const url = `${GITHUB_BASE_URL}/${fileName}`;
    const response = await axios.get(url);
    const data = response.data;

    // Simpan file mentah
    await fs.writeFile(path.join(DATA_DIR, fileName), JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${fileName}`);
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${fileName}:`, error);
    return null;
  }
}

async function generateCleanSongList(musicData: any[], questData: any[]) {
  console.log("⚙️  Generating optimized Song List...");
  
  const songList: SongMap[] = [];
  const processedAssetIds = new Set<string>();

  // 1. Mapping Music ID -> Chart IDs dari Quest
  // Kita cari quest yang punya musicId dan musicChartPatternId
  const musicToChartsMap = new Map<string, Set<string>>();
  
  if (Array.isArray(questData)) {
    questData.forEach((quest) => {
      if (quest.musicId && quest.musicChartPatternId) {
        if (!musicToChartsMap.has(quest.musicId)) {
          musicToChartsMap.set(quest.musicId, new Set());
        }
        musicToChartsMap.get(quest.musicId)?.add(quest.musicChartPatternId);
      }
    });
  }

  // 2. Bersihkan Data Music (Hapus Duplikat & Gabungkan dengan Chart)
  if (Array.isArray(musicData)) {
    musicData.forEach((song) => {
      // Filter lagu tanpa assetId atau yang sudah diproses
      if (!song.assetId || processedAssetIds.has(song.assetId)) return;

      const charts = musicToChartsMap.get(song.id) 
        ? Array.from(musicToChartsMap.get(song.id)!) 
        : [];

      // Hanya masukkan lagu yang punya chart (Playable) atau sesuai kebutuhanmu
      // Hapus kondisi 'if (charts.length > 0)' jika ingin semua lagu termasuk BGM
      songList.push({
        id: song.id,
        title: song.name,
        assetId: song.assetId,
        charts: charts
      });

      processedAssetIds.add(song.assetId);
    });
  }

  // Simpan file bersih untuk Frontend
  await fs.writeFile(
    path.join(DATA_DIR, "ProcessedSongList.json"), 
    JSON.stringify(songList, null, 2)
  );
  console.log(`✨ Generated ProcessedSongList.json with ${songList.length} unique songs.`);
}

const PUBLIC_DATA_DIR = path.join(__dirname, "../public/data/music"); 
const CHARTS_DIR = path.join(PUBLIC_DATA_DIR, "charts");

async function splitChartPatterns(chartData: any[]) {
  console.log("✂️  Splitting charts into individual files...");
  await fs.mkdir(CHARTS_DIR, { recursive: true });

  // 1. Grouping data by ID
  const chartsMap = new Map<string, any[]>();
  
  chartData.forEach((note) => {
    if (!chartsMap.has(note.id)) {
      chartsMap.set(note.id, []);
    }
    chartsMap.get(note.id)?.push(note);
  });

  // 2. Saving individual files
  let count = 0;
  for (const [chartId, notes] of chartsMap) {
    await fs.writeFile(
      path.join(CHARTS_DIR, `${chartId}.json`), 
      JSON.stringify(notes)
    );
    count++;
  }
  
  console.log(`✅ Splitted into ${count} chart files in ${CHARTS_DIR}`);
}

async function main() {
  // Pastikan folder public ada
  await fs.mkdir(PUBLIC_DATA_DIR, { recursive: true });

  // 1. Fetch Data Mentah
  const musicData = await fetchAndSave("Music.json");
  const chartData = await fetchAndSave("MusicChartPattern.json");
  const questData = await fetchAndSave("Quest.json");

  // 2. Generate Song List (Sama seperti sebelumnya)
  if (musicData && questData) {
    await generateCleanSongList(musicData, questData); // Pastikan function ini save ke PUBLIC_DATA_DIR juga
  }

  // 3. SPLIT CHART DATA (BARU)
  if (chartData) {
    await splitChartPatterns(chartData);
  }

  console.log("\n🎉 Music Data Ready for Frontend!");
}

main();