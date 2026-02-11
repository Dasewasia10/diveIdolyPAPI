import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// --- KONFIGURASI ---
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
// Simpan di folder 'storage' di dalam repo backend ini sendiri
const STORAGE_DIR = path.join(__dirname, "../data/music"); 
const CHARTS_DIR = path.join(STORAGE_DIR, "charts");

// Interface Sederhana
interface SongMap {
  id: string;
  title: string;
  assetId: string;
  charts: string[];
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
    
    // Simpan file mentah juga di storage agar rapi
    await fs.writeFile(path.join(STORAGE_DIR, fileName), JSON.stringify(data, null, 2));
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
  const musicToChartsMap = new Map<string, Set<string>>();
  
  // Mapping Chart IDs
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

  // Generate Song List
  if (Array.isArray(musicData)) {
    musicData.forEach((song) => {
      if (!song.assetId || processedAssetIds.has(song.assetId)) return;
      const charts = musicToChartsMap.get(song.id) ? Array.from(musicToChartsMap.get(song.id)!) : [];
      
      songList.push({
        id: song.id,
        title: song.name,
        assetId: song.assetId,
        charts: charts
      });
      processedAssetIds.add(song.assetId);
    });
  }

  // SIMPAN KE STORAGE BACKEND
  await fs.writeFile(
    path.join(STORAGE_DIR, "ProcessedSongList.json"), 
    JSON.stringify(songList, null, 2)
  );
  console.log(`✨ Generated ProcessedSongList.json in storage.`);
}

async function splitChartPatterns(chartData: any[]) {
  console.log("✂️  Splitting charts...");
  await ensureDirectoryExists(CHARTS_DIR);

  const chartsMap = new Map<string, any[]>();
  chartData.forEach((note) => {
    // Filter type 0 disini jika mau hemat storage
    if (note.type === 0) return; 

    if (!chartsMap.has(note.id)) {
      chartsMap.set(note.id, []);
    }
    chartsMap.get(note.id)?.push(note);
  });

  for (const [chartId, notes] of chartsMap) {
    await fs.writeFile(
      path.join(CHARTS_DIR, `${chartId}.json`), 
      JSON.stringify(notes)
    );
  }
  console.log(`✅ Splitted charts saved to ${CHARTS_DIR}`);
}

async function main() {
  await ensureDirectoryExists(STORAGE_DIR);

  const musicData = await fetchAndSave("Music.json");
  const chartData = await fetchAndSave("MusicChartPattern.json");
  const questData = await fetchAndSave("Quest.json");

  if (musicData && questData) {
    await generateCleanSongList(musicData, questData);
  }

  if (chartData) {
    await splitChartPatterns(chartData);
  }
  console.log("\n🎉 Music Data Sync Complete (Backend Storage Updated)!");
}

main();