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

// --- HELPER: GET ATTRIBUTE (LEBIH KUAT) ---
// Menangani format: key="value", key=value, dan spasi yang tidak rapi
const getAttr = (line, key) => {
    const regex = new RegExp(`${key}\\s*=\\s*(?:"([^"]*)"|([^\\s\\]]+))`, "i");
    const match = line.match(regex);
    if (match) return match[1] || match[2];
    return null;
};

// --- PARSER UTAMA ---
const parseScript = (rawText, assetId, isDebug = false) => {
    if (!rawText) return [];
    
    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    const scriptData = [];
    const backgroundMap = {}; // Menyimpan ID Background -> Filename

    let currentDialog = null;

    const flushBuffer = () => {
        if (currentDialog) {
            scriptData.push(currentDialog);
            currentDialog = null;
        }
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // 1. BACKGROUND DEFINITION
        if (trimmed.startsWith("[backgroundgroup")) {
            const bgRegex = /id=([^ ]+)\s+src=([^ \]]+)/g;
            let match;
            while ((match = bgRegex.exec(trimmed)) !== null) {
                backgroundMap[match[1]] = match[2];
            }
            return;
        }

        // 2. BACKGROUND CHANGE
        if (trimmed.startsWith("[backgroundsetting") || trimmed.startsWith("[backgroundtween")) {
            flushBuffer(); // Simpan dialog sebelumnya
            const bgId = getAttr(trimmed, "id");
            if (bgId && backgroundMap[bgId]) {
                scriptData.push({
                    type: "background",
                    src: `${R2_BG_URL}/${backgroundMap[bgId]}.webp`, // Asumsi format WebP
                    bgName: bgId
                });
            }
            return;
        }

        // 3. BGM CONTROL
        if (trimmed.startsWith("[bgmplay")) {
            flushBuffer(); // Simpan dialog sebelumnya
            const bgmId = getAttr(trimmed, "bgm");
            if (bgmId) {
                scriptData.push({
                    type: "bgm",
                    action: "play",
                    src: `${R2_BGM_URL}/${bgmId}.m4a` // Asumsi format Audio
                });
            }
            return;
        }
        if (trimmed.startsWith("[bgmstop")) {
            flushBuffer();
            scriptData.push({ type: "bgm", action: "stop" });
            return;
        }

        // 4. DIALOGUE & NARRATION
        if (trimmed.startsWith("[message") || trimmed.startsWith("[narration")) {
            flushBuffer(); // Pastikan dialog sebelumnya tersimpan

            const isNarration = trimmed.startsWith("[narration");
            let inlineText = getAttr(trimmed, "text");
            if (inlineText) inlineText = inlineText.replace(/\\n/g, "\n");

            let displayName = getAttr(trimmed, "name") || ""; 
            let speakerCode = getAttr(trimmed, "window");
            let iconUrl = null;

            // Handle Typo "thumbnial" dari file asli
            const thumbRaw = getAttr(trimmed, "thumbnial") || getAttr(trimmed, "thumbnail");
            if (thumbRaw) {
                const match = thumbRaw.match(/img_chr_adv_([a-z0-9]+)-/i);
                if (match) speakerCode = match[1];
            }

            // Fallback Logic
            if (!speakerCode && !isNarration) speakerCode = "unknown";
            if (isNarration) speakerCode = null;
            if (speakerCode) speakerCode = speakerCode.toLowerCase();

            // Mapping Name & Icon
            if (!displayName && speakerCode && SPEAKER_MAP[speakerCode]) {
                displayName = SPEAKER_MAP[speakerCode];
            }
            
            if (speakerCode && ICON_MAP[speakerCode]) {
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[speakerCode]}.png`;
            } else if (speakerCode && speakerCode !== "unknown" && !isNarration) {
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${speakerCode}.png`;
            }

            // Init Dialog Object
            currentDialog = {
                type: "dialogue",
                speakerCode,
                speakerName: displayName,
                iconUrl,
                voiceUrl: null, // Akan diisi jika baris berikutnya [voice]
                text: inlineText || "" 
            };
            return;
        }

        // 5. VOICE HANDLING (DIPERBAIKI)
        if (trimmed.startsWith("[voice")) {
            const voiceFile = getAttr(trimmed, "voice");
            const actorId = getAttr(trimmed, "actorId");
            const voiceUrl = voiceFile ? `${R2_VOICE_URL}/${assetId}/${voiceFile}.wav` : null;

            // LOGIKA PENYELAMATAN DATA:
            // Jika currentDialog null (karena ter-flush oleh [bgmplay] sebelumnya),
            // Kita cari elemen dialog terakhir di scriptData untuk ditempeli voice ini.
            let target = currentDialog;
            
            if (!target && scriptData.length > 0) {
                const lastItem = scriptData[scriptData.length - 1];
                if (lastItem.type === "dialogue") {
                    target = lastItem;
                }
            }

            if (target) {
                if (voiceUrl) target.voiceUrl = voiceUrl;
                
                // Update info speaker jika sebelumnya 'unknown' tapi di [voice] ada actorId
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
            return;
        }

        // 6. SELECTION / CHOICES (DIPERBAIKI)
        if (trimmed.startsWith("[select")) {
            flushBuffer();
            scriptData.push({
                type: "choice_selection", // KEMBALI KE PENAMAAN LAMA agar Skip bekerja
                text: getAttr(trimmed, "label") || "Select",
                nextLabel: getAttr(trimmed, "next")
            });
            return;
        }

        // 7. JUMPS & LABELS
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
    });

    flushBuffer();
    return scriptData;
};

// --- MAIN PROCESS ---
(async () => {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const groupedEvents = {};
    let totalFilesProcessed = 0;

    console.log(`Starting sync for ${FILE_LIST.length} files...`);

    for (let i = 0; i < FILE_LIST.length; i++) {
        const fileName = FILE_LIST[i];
        const assetId = fileName.replace(".txt", ""); 
        
        // Parsing ID (adv_love_2305_01_01) -> Event 2305, Ep 01, Part 01
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

        } catch (err) {
            console.error(`[ERROR] Failed processing ${fileName}:`, err.message);
        }
    }

    const indexData = Object.values(groupedEvents).sort((a, b) => a.id.localeCompare(b.id));
    fs.writeFileSync(path.join(OUTPUT_DIR, "index.json"), JSON.stringify(indexData, null, 2));

    console.log(`\nSync Completed! Processed ${totalFilesProcessed} files.`);
})();