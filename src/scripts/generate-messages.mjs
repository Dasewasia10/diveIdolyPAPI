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

// --- MAPPING ---
const SPEAKER_MAP = {
    "rio": "Rio Kanzaki", "aoi": "Aoi Igawa", "ai": "Ai Komiyama", "kkr": "Kokoro Akazaki",
    "rui": "Rui Tendo", "yu": "Yuu Suzumura", "smr": "Sumire Okuyama",
    "mna": "Mana Nagase", "ktn": "Kotono Nagase", "skr": "Sakura Kawasaki",
    "rei": "Rei Ichinose", "ngs": "Nagisa Ibuki", "hrk": "Haruko Saeki",
    "ski": "Saki Shiraishi", "suz": "Suzu Narumiya", "mei": "Mei Hayasaka",
    "szk": "Shizuku Hyodo", "chs": "Chisa Shiraishi", "chk": "Chika", "cca": "Cocoa",
    "chn": "Chino", "mhk": "Miho", "kan": "Kana", "kor": "Fran", "mana": "Mana Nagase",
    "tencho": "Manager", "saegusa": "Saegusa", "asakura": "Asakura", "koh": "Kohei"
};

const ICON_MAP = {
    "rio": "rio", "aoi": "aoi", "ai": "ai", "kkr": "kokoro",
    "rui": "rui", "yu": "yu", "smr": "sumire",
    "mna": "mana", "ktn": "kotono", "skr": "sakura",
    "rei": "rei", "ngs": "nagisa", "hrk": "haruko",
    "ski": "saki", "suz": "suzu", "mei": "mei",
    "szk": "shizuku",
    "chs": "chisa", "chk": "chika", "cca": "cocoa", 
    "chn": "chino", "mhk": "miho", "kan": "kana", "kor": "fran",
    "mana": "mana", "saegusa": "saegusa", "asakura": "asakura", "koh": "kohei", "stm": "satomi"
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

// --- ATTRIBUTE EXTRACTOR ---
const getAttr = (line, key) => {
    const regex = new RegExp(`${key}\\s*=\\s*(?:"([^"]*)"|([^\\s\\]]+))`, "i");
    const match = line.match(regex);
    return match ? (match[1] || match[2]) : null;
};

// ==========================================
// RECURSIVE PARSER ENGINE
// ==========================================

const parseRecursive = (lines, startIndex, lengthToParse, assetId) => {
    const results = [];
    let i = startIndex;
    const end = startIndex + lengthToParse;
    
    // Buffer Dialog (untuk merge [voice] ke [message])
    let currentDialog = null;
    let pendingChoiceTexts = []; // Menyimpan teks pilihan dari [choicegroup]

    const flushDialog = () => {
        if (currentDialog) {
            results.push(currentDialog);
            currentDialog = null;
        }
    };

    while (i < end && i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // --- A. BRANCHING LOGIC ---
        // 1. Deteksi [choicegroup] -> Ambil teks pilihan
        if (trimmed.startsWith("[choicegroup")) {
            flushDialog();
            pendingChoiceTexts = [];
            // Regex global untuk menangkap semua choices=[choice text=...]
            const choiceRegex = /text=([^\]]+)/g;
            let match;
            // Kita cari manual string choices=...
            // Karena regex global JS agak tricky di string kompleks, kita split sederhana
            const parts = trimmed.split("choices=[choice");
            parts.shift(); // hapus bagian awal tag
            parts.forEach(p => {
                const textAttr = getAttr(`text=${p}`, "text");
                if (textAttr) pendingChoiceTexts.push(textAttr);
            });
        }

        // 2. Deteksi [branchgroup] -> Sinyal mulai percabangan
        // Biasanya diikuti langsung oleh tag [branch] di baris-baris berikutnya
        else if (trimmed.startsWith("[branchgroup")) {
            flushDialog();
            // Kita tidak melakukan apa-apa di baris ini, 
            // logika sesungguhnya ada saat ketemu [branch] di bawah
        }

        // 3. Deteksi [branch] -> Mulai Rekursi
        else if (trimmed.startsWith("[branch")) {
            flushDialog();
            
            // Ambil panjang branch ini
            const branchLenStr = getAttr(trimmed, "groupLength");
            const branchLen = branchLenStr ? parseInt(branchLenStr, 10) : 0;

            // REKURSI: Parse isi branch ini
            const branchContent = parseRecursive(lines, i + 1, branchLen, assetId);
            
            // Ambil teks pilihan yang sesuai urutan
            const choiceText = pendingChoiceTexts.shift() || "Choice";

            // Masukkan ke result sebagai tipe 'choice_branch'
            // Nanti di frontend kita handle strukturnya
            results.push({
                type: "choice_branch",
                text: choiceText,
                script: branchContent // Nested Script!
            });

            // LOMPATI baris yang sudah diparse oleh rekursi
            i += branchLen; 
        }

        // --- B. DIALOGUE LOGIC (Sama seperti sebelumnya) ---
        else if (trimmed.startsWith("[message") || trimmed.startsWith("[narration")) {
            flushDialog();
            const isNarration = trimmed.startsWith("[narration");
            let text = getAttr(trimmed, "text") || "";
            text = text.replace(/\\n/g, "\n");
            let name = getAttr(trimmed, "name") || "";
            
            // Speaker Code & Icon
            let speakerCode = getAttr(trimmed, "window");
            let iconUrl = null;
            const thumbRaw = getAttr(trimmed, "thumbnial");
            if (thumbRaw) {
                const match = thumbRaw.match(/img_chr_adv_([a-z0-9]+)-/i);
                if (match) speakerCode = match[1];
            }

            if (!speakerCode && !isNarration) speakerCode = "unknown";
            if (isNarration) speakerCode = null;
            if (speakerCode) speakerCode = speakerCode.toLowerCase();

            if (!name && speakerCode && SPEAKER_MAP[speakerCode]) {
                name = SPEAKER_MAP[speakerCode];
            }

            if (speakerCode && ICON_MAP[speakerCode]) {
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[speakerCode]}.png`;
            } else if (speakerCode) {
                iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${speakerCode}.png`;
            }

            const voiceFile = getAttr(trimmed, "voice");
            const voiceUrl = voiceFile ? `${R2_VOICE_URL}/${assetId}/${voiceFile}.wav` : null;

            currentDialog = {
                type: "dialogue",
                speakerCode,
                speakerName: name,
                iconUrl,
                voiceUrl,
                text
            };
        }

        else if (trimmed.startsWith("[voice")) {
            if (currentDialog) {
                const voiceFile = getAttr(trimmed, "voice");
                const actorId = getAttr(trimmed, "actorId");
                if (voiceFile) currentDialog.voiceUrl = `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.wav`;
                if (actorId && (currentDialog.speakerCode === "unknown" || !currentDialog.speakerCode)) {
                    const code = actorId.toLowerCase();
                    currentDialog.speakerCode = code;
                    if (!currentDialog.iconUrl && ICON_MAP[code]) currentDialog.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
                    if (!currentDialog.speakerName && SPEAKER_MAP[code]) currentDialog.speakerName = SPEAKER_MAP[code];
                }
            }
        }

        else if (!trimmed.startsWith("[")) {
            if (currentDialog) {
                const cleanText = trimmed.replace(/\\n/g, "\n");
                if (!cleanText.includes("=")) {
                    currentDialog.text = currentDialog.text ? `${currentDialog.text}\n${cleanText}` : cleanText;
                }
            }
        }

        i++; // Lanjut ke baris berikutnya
    }

    flushDialog();
    return results;
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

        const lines = rawContent.replace(/\r\n/g, "\n").split("\n");
        // Panggil Recursive Parser dari baris 0 sampai akhir file
        const script = parseRecursive(lines, 0, lines.length, assetId);
        
        // Post-Processing: Merging Choice Branches
        // Parser menghasilkan urutan: [Dialogue, Dialogue, ChoiceBranch(A), ChoiceBranch(B), Dialogue]
        // Kita harus gabungkan ChoiceBranch(A) dan (B) menjadi satu object "choice_group"
        const finalScript = [];
        let currentChoiceGroup = null;

        script.forEach(item => {
            if (item.type === "choice_branch") {
                if (!currentChoiceGroup) {
                    currentChoiceGroup = {
                        type: "choice_selection",
                        choices: []
                    };
                    finalScript.push(currentChoiceGroup);
                }
                // Masukkan branch ke dalam group
                currentChoiceGroup.choices.push({
                    text: item.text,
                    route: item.script // Script rekursif tadi
                });
            } else {
                currentChoiceGroup = null; // Reset group jika ketemu dialog biasa
                finalScript.push(item);
            }
        });

        const jsonFileName = `${assetId}.json`;
        fs.writeFileSync(
            path.join(storiesDir, jsonFileName),
            JSON.stringify({
                id: assetId,
                title: `Episode ${parseInt(episode)} Part ${parseInt(part)}`,
                script: finalScript
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