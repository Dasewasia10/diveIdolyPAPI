import fs from "fs";
import path from "path";
import https from "https";
import zlib from "zlib";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://api.diveidolypapi.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/lovestoryTxt`;
const R2_VOICE_URL = `${R2_DOMAIN}/lovestoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;
const OUTPUT_DIR = path.join(__dirname, "../data/lovestory");

// --- DAFTAR FILE ---
const FILE_LIST = [
    // 2305
    "adv_love_2305_01_01.txt", "adv_love_2305_02_01.txt", "adv_love_2305_03_01.txt", "adv_love_2305_04_01.txt",
    "adv_love_2305_05_01.txt", "adv_love_2305_06_01.txt", "adv_love_2305_07_01.txt",
    "adv_love_2305_08_01.txt", "adv_love_2305_08_02.txt", "adv_love_2305_08_03.txt",
    // 2311
    "adv_love_2311_01_01.txt", "adv_love_2311_02_01.txt", "adv_love_2311_03_01.txt", "adv_love_2311_04_01.txt",
    "adv_love_2311_05_01.txt", "adv_love_2311_06_01.txt", "adv_love_2311_07_01.txt",
    "adv_love_2311_08_01.txt", "adv_love_2311_08_02.txt", "adv_love_2311_08_03.txt",
    // 2405
    "adv_love_2405_01_01.txt", "adv_love_2405_02_01.txt", "adv_love_2405_03_01.txt", "adv_love_2405_04_01.txt",
    "adv_love_2405_05_01.txt", "adv_love_2405_06_01.txt", "adv_love_2405_07_01.txt",
    "adv_love_2405_08_01.txt", "adv_love_2405_08_02.txt", "adv_love_2405_08_03.txt",
    // 2411
    "adv_love_2411_01_01.txt", "adv_love_2411_02_01.txt", "adv_love_2411_03_01.txt", "adv_love_2411_04_01.txt",
    "adv_love_2411_05_01.txt", "adv_love_2411_06_01.txt", "adv_love_2411_07_01.txt",
    "adv_love_2411_08_01.txt", "adv_love_2411_08_02.txt", "adv_love_2411_08_03.txt",
    // 2505
    "adv_love_2505_01_01.txt", "adv_love_2505_02_01.txt", "adv_love_2505_03_01.txt", "adv_love_2505_03_02.txt",
    "adv_love_2505_04_01.txt", "adv_love_2505_04_02.txt", "adv_love_2505_04_03.txt", "adv_love_2505_04_04.txt",
    "adv_love_2505_05_01.txt", "adv_love_2505_05_02.txt", "adv_love_2505_05_03.txt", "adv_love_2505_05_04.txt",
    "adv_love_2505_05_05.txt", "adv_love_2505_05_06.txt", "adv_love_2505_05_07.txt", "adv_love_2505_05_08.txt",
    "adv_love_2505_05_09.txt", "adv_love_2505_05_10.txt"
];

// --- MAPPING SPEAKER CODE ---
// Digunakan hanya jika 'name' tidak tersedia di [message]
const SPEAKER_MAP = {
    "rio": "Rio Kanzaki", "aoi": "Aoi Igawa", "ai": "Ai Komiyama", "kkr": "Kokoro Akazaki",
    "rui": "Rui Tendo", "yu": "Yuu Suzumura", "smr": "Sumire Okuyama",
    "mna": "Mana Nagase", "ktn": "Kotono Nagase", "skr": "Sakura Kawasaki",
    "rei": "Rei Ichinose", "ngs": "Nagisa Ibuki", "hrk": "Haruko Saeki",
    "ski": "Saki Shiraishi", "suz": "Suzu Narumiya", "mei": "Mei Hayasaka",
    "szk": "Shizuku Hyodo", "chs": "Chisa Shiraishi", "chk": "Chika", "cca": "Cocoa",
    "chn": "Chino", "mhk": "Miho", "kan": "Kana", "kor": "Fran", "mana": "Mana Nagase",
    "tencho": "Manager", "saegusa": "Saegusa", "asakura": "Asakura", 
    "koh": "Kohei" // Updated
};

// --- MAPPING NAMA FILE ICON (Kode -> Filename Lowercase) ---
const ICON_MAP = {
    // LizNoir
    "rio": "rio", "aoi": "aoi", "ai": "ai", "kkr": "kokoro",
    // TRINITYAiLE
    "rui": "rui", "yu": "yu", "smr": "sumire",
    // Hoshimi
    "mna": "mana", "ktn": "kotono", "skr": "sakura",
    "rei": "rei", "ngs": "nagisa", "hrk": "haruko",
    "ski": "saki", "suz": "suzu", "mei": "mei",
    "szk": "shizuku",
    // IIIX
    "chs": "chisa", "chk": "chika", "cca": "cocoa", 
    "chn": "chino", "mhk": "miho", "kan": "kana", "kor": "fran",
    // Others
    "mana": "mana",
    "saegusa": "saegusa",
    "asakura": "asakura",
    "koh": "kohei",
    "stm": "satomi" 
};

// --- FUNGSI FETCH ---
const fetchData = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                console.warn(`[FAIL] ${url} (${res.statusCode})`);
                resolve(null);
                return;
            }
            let stream = res;
            if (res.headers["content-encoding"] === "gzip") stream = res.pipe(zlib.createGunzip());
            else if (res.headers["content-encoding"] === "deflate") stream = res.pipe(zlib.createInflate());

            let data = "";
            stream.on("data", (chunk) => (data += chunk));
            stream.on("end", () => resolve(data));
            stream.on("error", reject);
        }).on("error", reject);
    });
};

// --- ROBUST ATTRIBUTE EXTRACTOR ---
// Mampu mengambil key="value" maupun key=value (dengan spasi)
const getAttr = (line, key) => {
    // Regex: key (spasi*) = (spasi*) "isi" ATAU isi
    // Menangkap value sampai ketemu spasi yang diikuti key= lain atau akhir string/tag
    const regex = new RegExp(`${key}\\s*=\\s*(?:"([^"]*)"|([^\\s\\]]+))`, "i");
    const match = line.match(regex);
    
    if (match) {
        return match[1] || match[2]; 
    }
    return null;
};

// --- PARSER ---
const parseScript = (rawText, assetId, isDebug = false) => {
    if (!rawText) return [];
    
    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    const scriptData = [];
    
    // Peta untuk menyimpan ID Background -> Nama File Source
    // Contoh: "hoshistore-02-noon" -> "env_adv_2d_hoshistore-02-noon"
    const backgroundMap = {};
    
    // Buffer untuk satu blok dialog
    // Kita menahan push sampai ketemu [message] berikutnya atau [select]/[jump]
    // agar [voice] yang mungkin ada di baris setelah [message] bisa digabung.
    let currentDialog = null;

    const flushBuffer = () => {
        if (currentDialog) {
            // Push jika ada konten
            scriptData.push(currentDialog);
            currentDialog = null;
        }
    };

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 0. PRE-PROCESSING: BACKGROUND GROUP DEFINITION
        // Format: [backgroundgroup backgrounds=[background id=... src=...] ...]
        if (trimmed.startsWith("[backgroundgroup")) {
            // Regex global untuk menangkap semua pasangan id dan src dalam satu baris
            const bgRegex = /id=([^ ]+)\s+src=([^ \]]+)/g;
            let match;
            while ((match = bgRegex.exec(trimmed)) !== null) {
                backgroundMap[match[1]] = match[2];
            }
            return;
        }

        // 1. CHANGE BACKGROUND (Setting or Tween)
        // Kita anggap tween juga sebagai perpindahan background langsung untuk simplifikasi
        if (trimmed.startsWith("[backgroundsetting") || trimmed.startsWith("[backgroundtween")) {
            flushBuffer();
            const bgId = getAttr(trimmed, "id");
            
            if (bgId && backgroundMap[bgId]) {
                const bgSrc = backgroundMap[bgId];
                scriptData.push({
                    type: "background",
                    src: `${R2_BG_URL}/${bgSrc}.webp`, // Asumsi format PNG/JPG/WEBP
                    bgName: bgId
                });
            }
            return;
        }

        // 2. BGM CONTROL
        if (trimmed.startsWith("[bgmplay")) {
            flushBuffer();
            const bgmId = getAttr(trimmed, "bgm");
            if (bgmId) {
                scriptData.push({
                    type: "bgm",
                    action: "play",
                    // Asumsi nama file di R2 sama dengan ID bgm
                    src: `${R2_BGM_URL}/${bgmId}.m4a` // Atau .mp3 tergantung file Anda
                });
            }
            return;
        }

        if (trimmed.startsWith("[bgmstop")) {
            flushBuffer();
            scriptData.push({
                type: "bgm",
                action: "stop"
            });
            return;
        }

        // 1. Tag [message] atau [narration]
        if (trimmed.startsWith("[message") || trimmed.startsWith("[narration")) {
            flushBuffer();

            const isNarration = trimmed.startsWith("[narration");
            
            // Ambil text (jika inline)
            let inlineText = getAttr(trimmed, "text");
            if (inlineText) inlineText = inlineText.replace(/\\n/g, "\n");

            // Ambil Nama Tampilan (langsung dari atribut name)
            let displayName = getAttr(trimmed, "name") || ""; 

            // Ambil Kode Speaker & Icon
            let speakerCode = getAttr(trimmed, "window"); // misal: "rei"
            let iconUrl = null;

            // Jika ada thumbnail, ambil kode dari sana
            const thumbRaw = getAttr(trimmed, "thumbnial"); // Typo asli game
            if (thumbRaw) {
                // img_chr_adv_rei-00 -> rei
                const match = thumbRaw.match(/img_chr_adv_([a-z0-9]+)-/i);
                if (match) speakerCode = match[1];
            }

            // Jika kode masih kosong dan bukan narasi, set unknown
            if (!speakerCode && !isNarration) speakerCode = "unknown";
            // Jika narasi, set null agar UI tidak menampilkan kotak nama
            if (isNarration) speakerCode = null;

            // Bersihkan kode (lowercase)
            if (speakerCode) speakerCode = speakerCode.toLowerCase();

            // Mapping Nama jika kosong (Fallback)
            if (!displayName && speakerCode && SPEAKER_MAP[speakerCode]) {
                displayName = SPEAKER_MAP[speakerCode];
            }

            // --- MAPPING ICON ---
            if (speakerCode && ICON_MAP[speakerCode]) {
                // Gunakan mapping: rei -> rei, hrk -> haruko, kkr -> kokoro
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[speakerCode]}.png`;
            } else if (speakerCode && speakerCode !== "unknown" && speakerCode !== "narration" && speakerCode !== "mob") {
                // Fallback jika tidak ada di map (gunakan kode aslinya)
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${speakerCode}.png`;
            }

            // Cek Voice
            const voiceFile = getAttr(trimmed, "voice");
            const voiceUrl = voiceFile ? `${R2_VOICE_URL}/${assetId}/${voiceFile}.wav` : null;

            currentDialog = {
                type: "dialogue",
                speakerCode,
                speakerName: displayName,
                iconUrl,
                voiceUrl,
                text: inlineText || "" 
            };
            return;
        }

        // 2. Tag [voice] (Merge ke dialog sebelumnya)
        if (trimmed.startsWith("[voice")) {
            if (currentDialog) {
                const voiceFile = getAttr(trimmed, "voice");
                const actorId = getAttr(trimmed, "actorId"); // kode seperti "rei"

                // Update Voice URL
                if (voiceFile) {
                    currentDialog.voiceUrl = `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.wav`;
                }

                // Update Info Speaker jika sebelumnya unknown
                if (actorId) {
                    const code = actorId.toLowerCase();
                    
                    if (currentDialog.speakerCode === "unknown" || !currentDialog.speakerCode) {
                        currentDialog.speakerCode = code;
                    }

                    // Update Icon jika belum ada (gunakan ICON_MAP)
                    if (!currentDialog.iconUrl && ICON_MAP[code]) {
                        currentDialog.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
                    }

                    // Update Nama jika belum ada
                    if (!currentDialog.speakerName && SPEAKER_MAP[code]) {
                        currentDialog.speakerName = SPEAKER_MAP[code];
                    }
                }
            }
            return;
        }

        // 3. Tag [narration] -> Dialog tanpa speaker
        if (trimmed.startsWith("[narration")) {
            flushBuffer();
            let text = getAttr(trimmed, "text") || "";
            text = text.replace(/\\n/g, "\n");

            currentDialog = {
                type: "dialogue",
                speakerCode: "narration",
                speakerName: "",
                iconUrl: null,
                voiceUrl: null,
                text: text
            };
            return;
        }

        // 4. Tag Pilihan [select]
        if (trimmed.startsWith("[select")) {
            flushBuffer();
            scriptData.push({
                type: "choice",
                text: getAttr(trimmed, "label") || "Select",
                nextLabel: getAttr(trimmed, "next")
            });
            return;
        }

        // 5. Tag Navigasi
        if (trimmed.startsWith("[jump")) {
            flushBuffer();
            scriptData.push({ type: "jump", nextLabel: getAttr(trimmed, "next") });
            return;
        }
        if (trimmed.startsWith("[label")) {
            flushBuffer();
            scriptData.push({ type: "anchor", labelName: getAttr(trimmed, "name") });
            return;
        }

        // 6. Teks baris (Fallback jika text tidak di dalam atribut)
        if (!trimmed.startsWith("[")) {
            // Jika ada dialog aktif, tambahkan teksnya
            if (currentDialog) {
                const cleanText = trimmed.replace(/\\n/g, "\n");
                // Cek agar tidak menambahkan sampah
                if (!cleanText.includes("=")) {
                    currentDialog.text = currentDialog.text 
                        ? `${currentDialog.text}\n${cleanText}` 
                        : cleanText;
                }
            }
        }
    });

    flushBuffer(); // Sisa buffer terakhir
    return scriptData;
};

// --- MAIN PROCESS ---
const generateLoveStory = async () => {
    // Setup Folder
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const storiesDir = path.join(OUTPUT_DIR, "stories");
    if (!fs.existsSync(storiesDir)) fs.mkdirSync(storiesDir, { recursive: true });

    const groupedEvents = {};
    let totalFilesProcessed = 0;

    console.log(`Processing ${FILE_LIST.length} files...`);

    for (let i = 0; i < FILE_LIST.length; i++) {
        const fileName = FILE_LIST[i];
        const regex = /adv_love_(\d{4})_(\d{2})_(\d{2})\.txt/;
        const match = fileName.match(regex);

        if (!match) continue;

        const [_, eventId, episode, part] = match;
        const assetId = fileName.replace(".txt", "");
        
        const rawContent = await fetchData(`${R2_TEXT_URL}/${fileName}`);

        if (!rawContent) {
            console.log(`[SKIP] 404: ${fileName}`);
            continue;
        }

        // Parse dengan Debug untuk file pertama
        const script = parseScript(rawContent, assetId, i === 0);
        
        if (i === 0 && script.length > 0) {
             console.log(`[SUCCESS] Parsed ${fileName}`);
             console.log("Sample Data:", JSON.stringify(script[0], null, 2));
        }

        const jsonFileName = `${assetId}.json`;
        fs.writeFileSync(
            path.join(storiesDir, jsonFileName),
            JSON.stringify({
                id: assetId,
                title: `Episode ${parseInt(episode)} Part ${parseInt(part)}`,
                script
            }, null, 2)
        );
        
        totalFilesProcessed++;

        if (!groupedEvents[eventId]) {
            groupedEvents[eventId] = {
                id: eventId,
                title: eventId === "2505" ? "Mintsuku 2025 (May)" : `Moshikoi 20${eventId.substring(0,2)} (${eventId.substring(2)})`,
                episodes: []
            };
        }

        groupedEvents[eventId].episodes.push({
            id: assetId, 
            title: `Ep ${parseInt(episode)} - ${parseInt(part)}`,
            fileName: jsonFileName
        });
    }

    const indexData = Object.values(groupedEvents).sort((a, b) => a.id.localeCompare(b.id));
    fs.writeFileSync(path.join(OUTPUT_DIR, "index.json"), JSON.stringify(indexData, null, 2));

    console.log(`[DONE] Generated ${indexData.length} Events from ${totalFilesProcessed} files.`);
};

generateLoveStory();