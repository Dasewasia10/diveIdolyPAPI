import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://api.diveidolypapi.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/lovestoryTxt`;
const R2_VOICE_URL = `${R2_DOMAIN}/lovestoryVoice`;
// Menggunakan path yang Anda minta sebelumnya
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

// --- HELPER: GET ATTRIBUTE ---
const getAttr = (line, key) => {
    const regex = new RegExp(`${key}\\s*=\\s*(?:"([^"]*)"|([^\\s\\]]+))`, "i");
    const match = line.match(regex);
    if (match) return match[1] || match[2];
    return null;
};

// --- HELPER: DETECT MAIN HEROINE ---
// Menghitung siapa yang paling banyak bicara selain MC
const detectMainHeroine = (script) => {
    const counts = {};
    const excluded = ["koh", "mob", "narration", "unknown", "tencho", "staff"]; // Ignore MC & NPC

    script.forEach(line => {
        if (line.type === "dialogue" && line.speakerCode) {
            const code = line.speakerCode.toLowerCase();
            if (!excluded.includes(code)) {
                counts[code] = (counts[code] || 0) + 1;
            }
        }
    });

    // Cari kode dengan jumlah dialog terbanyak
    let maxCount = 0;
    let mainHeroineCode = null;

    for (const [code, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            mainHeroineCode = code;
        }
    }

    return mainHeroineCode; // Mengembalikan kode, misal "rei"
};

// --- PARSER UTAMA (REKURSIF) ---
// Kita menerima array of lines, bukan string mentah, agar mudah dipotong
const parseLines = (lines, assetId) => {
    const scriptData = [];
    const backgroundMap = {}; 

    let currentDialog = null;

    const flushBuffer = () => {
        if (currentDialog) {
            scriptData.push(currentDialog);
            currentDialog = null;
        }
    };

    // Gunakan for loop biasa agar kita bisa memanipulasi index 'i' (untuk skip branch lines)
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;

        // 1. BACKGROUND DEFINITION
        if (trimmed.startsWith("[backgroundgroup")) {
            const bgRegex = /id=([^ ]+)\s+src=([^ \]]+)/g;
            let match;
            while ((match = bgRegex.exec(trimmed)) !== null) {
                backgroundMap[match[1]] = match[2];
            }
            continue;
        }

        // 2. BACKGROUND CHANGE
        if (trimmed.startsWith("[backgroundsetting") || trimmed.startsWith("[backgroundtween")) {
            flushBuffer();
            const bgId = getAttr(trimmed, "id");
            if (bgId && backgroundMap[bgId]) {
                scriptData.push({
                    type: "background",
                    src: `${R2_BG_URL}/${backgroundMap[bgId]}.webp`,
                    bgName: bgId
                });
            }
            continue;
        }

        // 3. BGM CONTROL
        if (trimmed.startsWith("[bgmplay")) {
            flushBuffer();
            const bgmId = getAttr(trimmed, "bgm");
            if (bgmId) {
                scriptData.push({
                    type: "bgm",
                    action: "play",
                    src: `${R2_BGM_URL}/${bgmId}.m4a`
                });
            }
            continue;
        }
        if (trimmed.startsWith("[bgmstop")) {
            flushBuffer();
            scriptData.push({ type: "bgm", action: "stop" });
            continue;
        }

        // 4. DIALOGUE & NARRATION
        if (trimmed.startsWith("[message") || trimmed.startsWith("[narration")) {
            flushBuffer();

            const isNarration = trimmed.startsWith("[narration");
            let inlineText = getAttr(trimmed, "text");
            if (inlineText) inlineText = inlineText.replace(/\\n/g, "\n");

            let displayName = getAttr(trimmed, "name") || ""; 
            let speakerCode = getAttr(trimmed, "window");
            let iconUrl = null;

            const thumbRaw = getAttr(trimmed, "thumbnial") || getAttr(trimmed, "thumbnail");
            if (thumbRaw) {
                const match = thumbRaw.match(/img_chr_adv_([a-z0-9]+)-/i);
                if (match) speakerCode = match[1];
            }

            if (!speakerCode && !isNarration) speakerCode = "unknown";
            if (isNarration) speakerCode = null;
            if (speakerCode) speakerCode = speakerCode.toLowerCase();

            if (!displayName && speakerCode && SPEAKER_MAP[speakerCode]) {
                displayName = SPEAKER_MAP[speakerCode];
            }
            
            if (speakerCode && ICON_MAP[speakerCode]) {
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[speakerCode]}.png`;
            } else if (speakerCode && speakerCode !== "unknown" && !isNarration) {
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${speakerCode}.png`;
            }

            currentDialog = {
                type: "dialogue",
                speakerCode,
                speakerName: displayName,
                iconUrl,
                voiceUrl: null, 
                text: inlineText || "" 
            };
            continue;
        }

        // 5. VOICE HANDLING (DEEP SEARCH)
        if (trimmed.startsWith("[voice")) {
            const voiceFile = getAttr(trimmed, "voice");
            const actorId = getAttr(trimmed, "actorId");
            const voiceUrl = voiceFile ? `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.wav` : null;

            let target = currentDialog;
            if (!target && scriptData.length > 0) {
                for (let j = scriptData.length - 1; j >= 0; j--) {
                    if (scriptData[j].type === "dialogue") {
                        target = scriptData[j];
                        break; 
                    }
                    if (scriptData[j].type === "choice_selection" || scriptData[j].type === "jump") break; 
                }
            }

            if (target) {
                if (voiceUrl) target.voiceUrl = voiceUrl;
                if (actorId) {
                    const code = actorId.toLowerCase();
                    if (target.speakerCode === "unknown" || !target.speakerCode) {
                        target.speakerCode = code;
                        if (!target.iconUrl && ICON_MAP[code]) {
                            target.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
                        }
                        if (!target.speakerName && SPEAKER_MAP[code]) {
                            target.speakerName = SPEAKER_MAP[code];
                        }
                    }
                }
            }
            continue;
        }

        // 6. CHOICE GROUP (LOGIKA BARU UNTUK CABANG)
        if (trimmed.startsWith("[choicegroup")) {
            flushBuffer();
            
            const choices = [];
            const choiceRegex = /text=([^\]]+)/g;
            let match;
            while ((match = choiceRegex.exec(trimmed)) !== null) {
                choices.push({ text: match[1].trim(), route: [] });
            }

            // Cek apakah baris berikutnya adalah [branchgroup]
            // Format biasanya: 
            // [choicegroup ...]
            // [branchgroup ...]
            // [branch ...] -> Konten Pilihan 1
            // [branch ...] -> Konten Pilihan 2
            
            if (i + 1 < lines.length && lines[i+1].trim().startsWith("[branchgroup")) {
                i++; // Skip [branchgroup] line
                
                // Sekarang loop untuk mengambil [branch] sebanyak jumlah choice
                for (let c = 0; c < choices.length; c++) {
                    // Cari [branch] berikutnya
                    while (i + 1 < lines.length && !lines[i+1].trim().startsWith("[branch")) {
                        i++; // Skip baris kosong atau tidak relevan
                    }
                    
                    if (i + 1 < lines.length) {
                        i++; // Masuk ke baris [branch]
                        const branchLine = lines[i].trim();
                        const lengthStr = getAttr(branchLine, "groupLength");
                        const length = lengthStr ? parseInt(lengthStr, 10) : 0;
                        
                        if (length > 0) {
                            // Ambil N baris berikutnya sebagai konten branch ini
                            const branchContentLines = lines.slice(i + 1, i + 1 + length);
                            
                            // REKURSIF: Parse konten branch ini
                            const branchScript = parseLines(branchContentLines, assetId);
                            choices[c].route = branchScript;
                            
                            // Majukan index utama 'i' agar tidak memparse ulang baris-baris ini di loop utama
                            i += length;
                        }
                    }
                }
            }

            if (choices.length > 0) {
                scriptData.push({
                    type: "choice_selection",
                    choices: choices
                });
            }
            continue;
        }

        // 7. JUMPS & LABELS
        if (trimmed.startsWith("[jump")) {
            flushBuffer();
            scriptData.push({ type: "jump", nextLabel: getAttr(trimmed, "next") });
            continue;
        }
        if (trimmed.startsWith("[label")) {
            flushBuffer();
            scriptData.push({ type: "anchor", labelName: getAttr(trimmed, "name") });
            continue;
        }

        // 8. APPEND TEXT
        if (!trimmed.startsWith("[")) {
            if (currentDialog) {
                const cleanText = trimmed.replace(/\\n/g, "\n");
                if (!cleanText.includes("=")) {
                    currentDialog.text = currentDialog.text 
                        ? `${currentDialog.text}\n${cleanText}` 
                        : cleanText;
                }
            }
        }
    }

    flushBuffer();
    return scriptData;
};

// --- WRAPPER FOR RAW TEXT ---
const parseScript = (rawText, assetId, isDebug = false) => {
    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    return parseLines(lines, assetId);
};

// --- FETCH HELPER ---
const fetchData = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
                return;
            }
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
        }).on("error", reject);
    });
};

// --- MAIN EXECUTION ---
(async () => {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const groupedEvents = {};
    let totalFilesProcessed = 0;

    console.log(`Starting sync for ${FILE_LIST.length} files...`);

    for (let i = 0; i < FILE_LIST.length; i++) {
        const fileName = FILE_LIST[i];
        const assetId = fileName.replace(".txt", ""); 
        
        const parts = assetId.split("_");
        const eventId = parts[2];
        const episode = parts[3];
        const part = parts[4];

        try {
            const buffer = await fetchData(`${R2_TEXT_URL}/${fileName}`);
            const rawContent = buffer.toString("utf-8");
            
            const script = parseScript(rawContent, assetId, i === 0);
            
            const jsonFileName = `${assetId}.json`;
            fs.writeFileSync(
                path.join(OUTPUT_DIR, jsonFileName),
                JSON.stringify({
                    id: assetId,
                    title: `Episode ${parseInt(episode)} Part ${parseInt(part)}`,
                    script
                }, null, 2)
            );
            
            totalFilesProcessed++;

            if (!groupedEvents[eventId]) {
                // Deteksi Heroine dari script episode pertama ini
                const mainHeroineCode = detectMainHeroine(script);
                const heroineName = mainHeroineCode && SPEAKER_MAP[mainHeroineCode] 
                    ? SPEAKER_MAP[mainHeroineCode] 
                    : "Unknown Story";

                // Format Judul
                let eventTitle = "";
                if (eventId === "2505") {
                    eventTitle = "Mintsuku 2025 (Magical Girl & Succubus)";
                } else {
                    // Gunakan format: Moshikoi 20YY (Nama Heroine)
                    eventTitle = `Moshikoi 20${eventId.substring(0,2)} (${heroineName})`;
                }

                groupedEvents[eventId] = {
                    id: eventId,
                    title: eventTitle,
                    episodes: []
                };
            }

            groupedEvents[eventId].episodes.push({
                id: assetId, 
                title: `Ep ${parseInt(episode)} - ${parseInt(part)}`,
                fileName: jsonFileName
            });

        } catch (err) {
            console.error(`[ERROR] Failed processing ${fileName}:`, err.message);
        }
    }

    const indexData = Object.values(groupedEvents).sort((a, b) => a.id.localeCompare(b.id));
    fs.writeFileSync(path.join(OUTPUT_DIR, "index.json"), JSON.stringify(indexData, null, 2));

    console.log(`\nSync Completed! Processed ${totalFilesProcessed} files.`);
})();