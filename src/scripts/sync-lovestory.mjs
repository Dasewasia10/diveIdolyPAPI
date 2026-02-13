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
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;

const OUTPUT_DIR = path.join(__dirname, "../data/lovestory");

// --- DAFTAR FILE (Sesuai list Anda) ---
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

const SPEAKER_MAP = {
    "rio": "Rio Kanzaki", "aoi": "Aoi Igawa", "ai": "Ai Komiyama", "kkr": "Kokoro Akazaki",
    "rui": "Rui Tendo", "yu": "Yuu Suzumura", "smr": "Sumire Okuyama",
    "mna": "Mana Nagase", "ktn": "Kotono Nagase", "skr": "Sakura Kawasaki",
    "rei": "Rei Ichinose", "ngs": "Nagisa Ibuki", "hrk": "Haruko Saeki",
    "ski": "Saki Shiraishi", "suz": "Suzu Narumiya", "mei": "Mei Hayasaka",
    "szk": "Shizuku Hyodo", "chs": "Chisa Shiraishi", "chk": "Chika", "cca": "Cocoa",
    "chn": "Chino", "mhk": "Miho", "kan": "Kana", "kor": "Fran", "mana": "Mana Nagase",
    "tencho": "Manager", "saegusa": "Saegusa", "asakura": "Asakura", 
    "koh": "Kohei" 
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

// --- HELPERS ---
const getStartTime = (line) => {
    const match = line.match(/_startTime\\?":\s*([0-9.]+)/);
    return match ? parseFloat(match[1]) : null;
};

const getAttr = (line, key) => {
    const regex = new RegExp(`${key}\\s*=\\s*(?:"([^"]*)"|([^\\s\\]]+))`, "i");
    const match = line.match(regex);
    if (match) return match[1] || match[2];
    return null;
};

const extractMessageText = (line) => {
    const startMatch = line.match(/text=/);
    if (!startMatch) return null;
    const startIndex = startMatch.index + 5; 
    let rest = line.substring(startIndex);
    const nextAttrRegex = /\s+(name|voice|clip|hide|actorId|window|thumbnial|thumbnail)=/i;
    const nextMatch = rest.match(nextAttrRegex);
    let content = "";
    if (nextMatch) {
        content = rest.substring(0, nextMatch.index);
    } else {
        content = rest.replace(/\s*\]\s*$/, ""); 
    }
    return content.trim(); 
};

const detectMainHeroine = (script) => {
    const counts = {};
    const excluded = ["koh", "mob", "narration", "unknown", "tencho", "staff"]; 
    script.forEach(line => {
        if (line.type === "dialogue" && line.speakerCode) {
            const code = line.speakerCode.toLowerCase();
            if (!excluded.includes(code)) {
                counts[code] = (counts[code] || 0) + 1;
            }
        }
    });
    let maxCount = 0;
    let mainHeroineCode = null;
    for (const [code, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            mainHeroineCode = code;
        }
    }
    return mainHeroineCode;
};

// --- PARSER ---
const parseLines = (lines, assetId) => {
    const scriptData = [];
    const backgroundMap = {}; 

    let currentDialog = null;
    // Buffer untuk menyimpan SFX yang muncul SEBELUM dialog (kasus edge case)
    let pendingSfx = [];

    const flushBuffer = () => {
        // Jika ada SFX yang menggantung dan tidak menemukan induk dialog, dorong sebagai standalone
        if (pendingSfx.length > 0) {
            pendingSfx.forEach(sfxObj => scriptData.push(sfxObj));
            pendingSfx = [];
        }
        if (currentDialog) {
            scriptData.push(currentDialog);
            currentDialog = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;

        // 1. BACKGROUND DEF
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
            flushBuffer(); // FLUSH WAJIB: Background berubah = scene baru
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
            flushBuffer(); // FLUSH WAJIB: Memastikan BGM muncul SETELAH dialog sebelumnya selesai
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
            flushBuffer(); // FLUSH WAJIB
            scriptData.push({ type: "bgm", action: "stop" });
            continue;
        }

        // 4. SFX HANDLING (Improved Retroactive & Pending)
        if (trimmed.startsWith("[se")) {
            // JANGAN flushBuffer di sini agar bisa menempel ke dialog aktif
            const seId = getAttr(trimmed, "se");
            const seStartTime = getStartTime(trimmed);
            const seSrc = seId ? `${R2_BGM_URL}/${seId}.m4a` : null;

            if (seId && seSrc) {
                const sfxItem = {
                    type: "sfx",
                    src: seSrc,
                    startTime: seStartTime
                };

                let attached = false;

                // STRATEGI 1: Tempel ke Dialog yang SEDANG aktif (belum di-flush)
                if (currentDialog && currentDialog.startTime !== null && seStartTime !== null) {
                    // Cek waktu: SFX harus terjadi SETELAH atau BERSAMAAN dengan dialog
                    // (Toleransi -0.5s jaga-jaga pembulatan float)
                    if (seStartTime >= (currentDialog.startTime - 0.5)) {
                        const delayMs = Math.max(0, (seStartTime - currentDialog.startTime) * 1000);
                        currentDialog.sfxList.push({ src: seSrc, delay: delayMs });
                        attached = true;
                    }
                }
                
                // STRATEGI 2: Jika tidak ada dialog aktif, cari Dialog TERAKHIR di scriptData (Backtracking)
                // Ini untuk kasus: Dialog -> Background Change -> SFX (SFX harusnya milik dialog tadi)
                if (!attached && scriptData.length > 0) {
                    for (let j = scriptData.length - 1; j >= 0; j--) {
                        const lastItem = scriptData[j];
                        // Stop jika ketemu batas scene keras (Pilihan/Jump/Stop BGM)
                        if (lastItem.type === 'choice_selection' || lastItem.type === 'jump' || (lastItem.type === 'bgm' && lastItem.action === 'stop')) break;

                        if (lastItem.type === 'dialogue') {
                            if (seStartTime !== null && lastItem.startTime !== null && seStartTime >= (lastItem.startTime - 0.5)) {
                                const delayMs = Math.max(0, (seStartTime - lastItem.startTime) * 1000);
                                if (!lastItem.sfxList) lastItem.sfxList = [];
                                lastItem.sfxList.push({ src: seSrc, delay: delayMs });
                                attached = true;
                            }
                            break; // Hanya cek dialog terakhir yang relevan
                        }
                    }
                }

                // STRATEGI 3: Jika belum nempel juga (mungkin SFX muncul sebelum Text di file), simpan di Pending
                if (!attached) {
                    pendingSfx.push(sfxItem);
                }
            }
            continue;
        }

        // 5. DIALOGUE & NARRATION
        if (trimmed.startsWith("[message") || trimmed.startsWith("[narration")) {
            // Jangan flushBuffer() standar, kita proses manual
            if (currentDialog) {
                scriptData.push(currentDialog);
                currentDialog = null;
            }

            const isNarration = trimmed.startsWith("[narration");
            let inlineText = extractMessageText(trimmed); 
            if (!inlineText) inlineText = getAttr(trimmed, "text");
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

            const startTime = getStartTime(trimmed);

            const newDialog = {
                type: "dialogue",
                speakerCode,
                speakerName: displayName,
                iconUrl,
                voiceUrl: null, 
                text: inlineText || "",
                startTime: startTime,
                sfxList: []
            };

            // CEK PENDING SFX (Forward Attachment)
            // Cek apakah ada SFX yang "mengantri" dan waktunya cocok dengan dialog ini
            if (pendingSfx.length > 0 && startTime !== null) {
                pendingSfx.forEach(sfx => {
                    // Logic: Jika SFX terjadi SETELAH atau BERSAMAAN dengan dialog ini (toleransi 0.5s)
                    if (sfx.startTime !== null && sfx.startTime >= (startTime - 0.5)) {
                        const delayMs = Math.max(0, (sfx.startTime - startTime) * 1000);
                        newDialog.sfxList.push({ src: sfx.src, delay: delayMs });
                    } else {
                        // Jika SFX terjadi JAUH SEBELUM dialog ini, berarti dia standalone
                        scriptData.push(sfx); 
                    }
                });
                pendingSfx = []; // Kosongkan buffer
            } else if (pendingSfx.length > 0) {
                // Jika dialog ini tidak punya startTime, flush semua pending sebagai standalone
                pendingSfx.forEach(sfx => scriptData.push(sfx));
                pendingSfx = [];
            }

            currentDialog = newDialog;
            continue;
        }

        // 6. VOICE
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
                    if (scriptData[j].type === "choice_selection") break; 
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

        // 7. CHOICE
        if (trimmed.startsWith("[choicegroup")) {
            flushBuffer();
            const choices = [];
            const choiceRegex = /text=([^\]]+)/g;
            let match;
            while ((match = choiceRegex.exec(trimmed)) !== null) {
                choices.push({ text: match[1].trim(), route: [] });
            }

            if (i + 1 < lines.length && lines[i+1].trim().startsWith("[branchgroup")) {
                i++; 
                for (let c = 0; c < choices.length; c++) {
                    while (i + 1 < lines.length && !lines[i+1].trim().startsWith("[branch")) {
                        i++;
                    }
                    if (i + 1 < lines.length) {
                        i++; 
                        const branchLine = lines[i].trim();
                        const lengthStr = getAttr(branchLine, "groupLength");
                        const length = lengthStr ? parseInt(lengthStr, 10) : 0;
                        if (length > 0) {
                            const branchContentLines = lines.slice(i + 1, i + 1 + length);
                            const branchScript = parseLines(branchContentLines, assetId);
                            choices[c].route = branchScript;
                            i += length;
                        }
                    }
                }
            }
            if (choices.length > 0) {
                scriptData.push({ type: "choice_selection", choices: choices });
            }
            continue;
        }

        // 8. JUMPS
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

        // 9. TEXT APPEND
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

// --- WRAPPER ---
const parseScript = (rawText, assetId, isDebug = false) => {
    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    return parseLines(lines, assetId);
};

// --- FETCH ---
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

// --- MAIN ---
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
                const mainHeroineCode = detectMainHeroine(script);
                const heroineName = mainHeroineCode && SPEAKER_MAP[mainHeroineCode] 
                    ? SPEAKER_MAP[mainHeroineCode] 
                    : "Unknown Story";

                let eventTitle = "";
                if (eventId === "2505") {
                    eventTitle = "Mintsuku 2025 (Magical Girl & Succubus)";
                } else {
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