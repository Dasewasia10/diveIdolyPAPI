import fs from "fs";
import path from "path";
import https from "https";
import zlib from "zlib";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_BASE = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
const R2_DOMAIN = "https://api.diveidolypapi.my.id"; 
const R2_TEXT_URL = `${R2_DOMAIN}/lovestoryTxt`;
const R2_VOICE_URL = `${R2_DOMAIN}/lovestoryVoice`;

const OUTPUT_DIR = path.join(__dirname, "../data/lovestory");

// --- MAPPING SPEAKER (Lengkap) ---
const SPEAKER_MAP = {
    "rio": "Rio Kanzaki", "aoi": "Aoi Igawa", "ai": "Ai Komiyama", "kkr": "Kokoro Akazaki",
    "rui": "Rui Tendo", "yu": "Yuu Suzumura", "smr": "Sumire Okuyama",
    "mna": "Mana Nagase", "ktn": "Kotono Nagase", "skr": "Sakura Kawasaki",
    "rei": "Rei Ichinose", "ngs": "Nagisa Ibuki", "hrk": "Haruko Saeki",
    "ski": "Saki Shiraishi", "suz": "Suzu Narumiya", "mei": "Mei Hayasaka",
    "szk": "Shizuku Hyodo",
    "chs": "Chisa Shiraishi", "chk": "Chika", "cca": "Cocoa", 
    "chn": "Chino", "mhk": "Miho", "kan": "Kana", "kor": "Fran",
    "mana": "Mana Nagase",
    "tencho": "Manager", "saegusa": "Saegusa", "asakura": "Asakura", "koh": "Kohei" 
};

// --- HELPER: RESOLVE FILENAME (Format Fixer) ---
const resolveFilename = (assetId) => {
    if (assetId.startsWith("love_")) return `adv_${assetId}`;
    if (assetId.startsWith("love-story-")) {
        const regex = /love-story-(\d{2})-(\d{2})\d{2}-(\d{3})(?:-(\d{3}))?/;
        const match = assetId.match(regex);
        if (match) {
            const [_, year, month, ep, sc] = match;
            const scene = sc ? parseInt(sc, 10).toString().padStart(2, "0") : "01";
            const episode = parseInt(ep, 10).toString().padStart(2, "0");
            return `adv_love_${year}${month}_${episode}_${scene}`;
        }
    }
    return assetId;
};

// --- FUNGSI FETCH ---
const fetchData = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchData(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        if (url.endsWith(".txt")) {
            console.warn(`[WARN] File not found: ${url}`);
            resolve(null);
            return;
        }
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      let stream = res;
      if (res.headers["content-encoding"] === "gzip") stream = res.pipe(zlib.createGunzip());
      else if (res.headers["content-encoding"] === "deflate") stream = res.pipe(zlib.createInflate());

      let data = "";
      stream.on("data", (chunk) => (data += chunk));
      stream.on("end", () => {
        try {
            if (url.endsWith(".json")) resolve(JSON.parse(data));
            else resolve(data);
        } catch (e) {
          reject(e);
        }
      });
      stream.on("error", reject);
    }).on("error", reject);
  });
};

// --- CORE PARSER LOGIC ---
const parseAdvScript = (rawText, assetId) => {
    if (!rawText) return [];
    
    const lines = rawText.split(/\r?\n/); // Handle CRLF & LF
    const scriptData = [];
    
    // Helper untuk mengekstrak atribut secara aman (dengan atau tanpa kutip)
    const getAttr = (line, key) => {
        // Regex: key = "value"  ATAU  key=value
        const regex = new RegExp(`${key}\\s*=\\s*(?:"([^"]*)"|([^\\s\\]]+))`);
        const match = line.match(regex);
        if (match) return match[1] || match[2]; // Return group 1 (quoted) or 2 (unquoted)
        return null;
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 1. Tag [message ...] -> Dialog Baru
        if (trimmed.startsWith("[message")) {
            const windowVal = getAttr(trimmed, "window");
            const voiceVal = getAttr(trimmed, "voice");
            
            let speakerCode = "unknown";
            
            // Logic Speaker dari Voice File
            if (voiceVal) {
                // voiceVal: "sud_vo_adv_love_2305_01_01-hrk001"
                const parts = voiceVal.split("-");
                const lastPart = parts[parts.length - 1]; // "hrk001"
                // Hapus angka dan ekstensi file (jika ada di string raw)
                const code = lastPart.replace(/[0-9.]/g, "").replace("wav", ""); 
                if (code) speakerCode = code;
            }

            // Logic Speaker dari Window (Prioritas)
            if (windowVal && windowVal !== "") {
                speakerCode = windowVal;
            }

            const speakerName = SPEAKER_MAP[speakerCode] || speakerCode.toUpperCase();
            const voiceUrl = voiceVal ? `${R2_VOICE_URL}/${assetId}/${voiceVal}.wav` : null;

            scriptData.push({
                type: "dialogue",
                speakerCode,
                speakerName,
                voiceUrl,
                text: "" // Placeholder, diisi di step 4
            });
            return;
        }

        // 2. Tag [select ...] -> Pilihan
        if (trimmed.startsWith("[select")) {
            scriptData.push({
                type: "choice",
                text: getAttr(trimmed, "label") || "Choice",
                nextLabel: getAttr(trimmed, "next")
            });
            return;
        }

        // 3. Tag [label] & [jump] -> Navigasi
        if (trimmed.startsWith("[label")) {
            scriptData.push({ type: "anchor", labelName: getAttr(trimmed, "name") });
            return;
        }
        if (trimmed.startsWith("[jump")) {
            scriptData.push({ type: "jump", nextLabel: getAttr(trimmed, "next") });
            return;
        }

        // 4. Skip tag sistem lain ([background], [actor], dll)
        if (trimmed.startsWith("[")) {
            return; 
        }

        // 5. Teks Dialog (Baris tanpa bracket)
        // Cari dialog aktif terakhir
        // Kita loop mundur untuk mencari dialog terakhir yg belum kena 'choice' atau 'jump'
        const lastItem = scriptData[scriptData.length - 1];
        
        if (lastItem && lastItem.type === "dialogue") {
            // Append text (handle multiline dengan spasi/newline)
            const cleanText = trimmed.replace(/\\n/g, "\n");
            if (lastItem.text) {
                lastItem.text += "\n" + cleanText;
            } else {
                lastItem.text = cleanText;
            }
        }
    });

    // 6. CLEANUP: Hapus dialog kosong yang tidak punya suara
    // (Kadang ada tag message kosong untuk setup sistem)
    return scriptData.filter(item => {
        if (item.type === "dialogue") {
            // Keep jika ada teks ATAU ada suara
            return (item.text && item.text.trim().length > 0) || item.voiceUrl;
        }
        return true;
    });
};

// --- MAIN SYNC ---
const syncLoveStory = async () => {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const storiesDir = path.join(OUTPUT_DIR, "stories");
    if (!fs.existsSync(storiesDir)) fs.mkdirSync(storiesDir, { recursive: true });

    console.log("Fetching Metadata...");
    
    try {
        const episodes = await fetchData(`${GITHUB_BASE}/LoveStoryEpisode.json`);
        if (!episodes) throw new Error("Gagal mengambil LoveStoryEpisode.json");

        const storyGroups = {};
        episodes.forEach(ep => {
            if (!storyGroups[ep.loveId]) storyGroups[ep.loveId] = [];
            storyGroups[ep.loveId].push(ep);
        });

        const indexData = [];

        for (const [loveId, episodeList] of Object.entries(storyGroups)) {
            episodeList.sort((a, b) => a.episode - b.episode);
            const title = `Event Story ${loveId}`;

            indexData.push({
                id: loveId,
                title: title,
                episodeCount: episodeList.length,
                episodes: episodeList.map(e => ({
                    id: e.storyId,
                    episode: e.episode,
                    title: `Episode ${e.episode}`
                }))
            });

            for (const ep of episodeList) {
                if (!ep.assetId) continue;

                // FIX NAMA FILE
                const realFileName = resolveFilename(ep.assetId);
                const txtUrl = `${R2_TEXT_URL}/${realFileName}.txt`;
                
                console.log(`Processing: ${realFileName}...`);
                
                const rawScript = await fetchData(txtUrl);
                
                if (rawScript) {
                    const parsedScript = parseAdvScript(rawScript, realFileName);
                    
                    fs.writeFileSync(
                        path.join(storiesDir, `${ep.storyId}.json`),
                        JSON.stringify({
                            id: ep.storyId,
                            title: `Episode ${ep.episode}`,
                            script: parsedScript
                        }, null, 2)
                    );
                } else {
                    console.log(`Skipping ${realFileName} (File not found on R2)`);
                }
            }
        }

        fs.writeFileSync(
            path.join(OUTPUT_DIR, "index.json"),
            JSON.stringify(indexData, null, 2)
        );

        console.log("[SUCCESS] Love Story Sync Complete.");

    } catch (error) {
        console.error("[ERROR]", error);
    }
};

syncLoveStory();