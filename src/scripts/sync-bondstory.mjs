import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://api.diveidolypapi.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/bondStoryTxt`;
const R2_VOICE_URL = `${R2_DOMAIN}/bondStoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;

const OUTPUT_DIR = path.join(__dirname, "../data/bondstory");
const FOLDER_LIST_PATH = path.join(__dirname, "../data/bond_folderList.txt"); // Asumsi file ada di folder yang sama

// --- MAPPING KARAKTER (Bisa dilengkapi) ---
const CHARACTER_NAMES = {
    "ai": "Ai Komiyama", "aoi": "Aoi Igawa", "chs": "Chisa Shiraishi",
    "hrk": "Haruko Saeki", "kkr": "Kokoro Akazaki", "ktn": "Kotono Nagase",
    "mei": "Mei Hayasaka", "mna": "Mana Nagase", "ngs": "Nagisa Ibuki",
    "rei": "Rei Ichinose", "rio": "Rio Kanzaki", "rui": "Rui Tendo",
    "ski": "Saki Shiraishi", "skr": "Sakura Kawasaki", "smr": "Sumire Okuyama",
    "suz": "Suzu Narumiya", "szk": "Shizuku Hyodo", "yu": "Yuu Suzumura",
    "kana": "Kana", "miho": "Miho", "fran": "Fran"
};

const ICON_MAP = {
    "rio": "rio", "aoi": "aoi", "ai": "ai", "kkr": "kokoro",
    "rui": "rui", "yu": "yu", "smr": "sumire",
    "mna": "mana", "ktn": "kotono", "skr": "sakura",
    "rei": "rei", "ngs": "nagisa", "hrk": "haruko",
    "ski": "saki", "suz": "suzu", "mei": "mei",
    "szk": "shizuku", "chs": "chisa", "chk": "chika", "cca": "cocoa", 
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

// --- PARSER (Simplified for Bond Story) ---
const parseLines = (lines, assetId) => {
    const scriptData = [];
    const backgroundMap = {}; 

    let currentDialog = null;
    let pendingSfx = [];

    const flushBuffer = () => {
        if (pendingSfx.length > 0) {
            pendingSfx.forEach(sfxObj => scriptData.push(sfxObj));
            pendingSfx = [];
        }
        if (currentDialog) {
            scriptData.push(currentDialog);
            currentDialog = null;
        }
    };

    let foundTitle = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) continue;

        // 0. TITLE EXTRACTION (Special for Bond)
        if (trimmed.startsWith("[title")) {
            foundTitle = getAttr(trimmed, "title");
            continue;
        }

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

        // 3. BGM
        if (trimmed.startsWith("[bgmplay") || (trimmed.startsWith("[bgm ") && !trimmed.startsWith("[bgmstop"))) {
            flushBuffer();
            // Handle variasi tag [bgm] atau [bgmplay]
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

        // 4. SFX
        if (trimmed.startsWith("[se")) {
            const seId = getAttr(trimmed, "se");
            const seStartTime = getStartTime(trimmed);
            const seSrc = seId ? `${R2_BGM_URL}/${seId}.m4a` : null;

            if (seId && seSrc) {
                const sfxItem = { type: "sfx", src: seSrc, startTime: seStartTime };
                let attached = false;

                if (currentDialog && currentDialog.startTime !== null && seStartTime !== null) {
                    if (seStartTime >= (currentDialog.startTime - 0.5)) {
                        const delayMs = Math.max(0, (seStartTime - currentDialog.startTime) * 1000);
                        currentDialog.sfxList.push({ src: seSrc, delay: delayMs });
                        attached = true;
                    }
                }
                
                if (!attached && scriptData.length > 0) {
                    for (let j = scriptData.length - 1; j >= 0; j--) {
                        const lastItem = scriptData[j];
                        if (lastItem.type === 'bgm' && lastItem.action === 'stop') break; 
                        if (lastItem.type === 'dialogue') {
                            if (seStartTime !== null && lastItem.startTime !== null && seStartTime >= (lastItem.startTime - 0.5)) {
                                const delayMs = Math.max(0, (seStartTime - lastItem.startTime) * 1000);
                                if (!lastItem.sfxList) lastItem.sfxList = [];
                                lastItem.sfxList.push({ src: seSrc, delay: delayMs });
                                attached = true;
                            }
                            break;
                        }
                    }
                }

                if (!attached) {
                    pendingSfx.push(sfxItem);
                }
            }
            continue;
        }

        // 5. DIALOGUE & NARRATION
        if (trimmed.startsWith("[message") || trimmed.startsWith("[narration")) {
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

            if (!displayName && speakerCode && CHARACTER_NAMES[speakerCode]) {
                displayName = CHARACTER_NAMES[speakerCode];
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

            // Attach Pending SFX
            if (pendingSfx.length > 0 && startTime !== null) {
                pendingSfx.forEach(sfx => {
                    if (sfx.startTime !== null && sfx.startTime >= (startTime - 0.5)) {
                        const delayMs = Math.max(0, (sfx.startTime - startTime) * 1000);
                        newDialog.sfxList.push({ src: sfx.src, delay: delayMs });
                    } else {
                        scriptData.push(sfx); 
                    }
                });
                pendingSfx = []; 
            } else if (pendingSfx.length > 0) {
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
            const voiceUrl = voiceFile ? `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.m4a` : null;

            let target = currentDialog;
            if (!target && scriptData.length > 0) {
                // Backtrack untuk mencari dialog terakhir
                for (let j = scriptData.length - 1; j >= 0; j--) {
                    if (scriptData[j].type === "dialogue") {
                        target = scriptData[j];
                        break; 
                    }
                }
            }

            if (target) {
                if (voiceUrl) target.voiceUrl = voiceUrl;
                if (actorId) {
                    const code = actorId.toLowerCase();
                    if (!target.speakerCode || target.speakerCode === "unknown") {
                        target.speakerCode = code;
                        if (!target.iconUrl && ICON_MAP[code]) {
                            target.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
                        }
                    }
                }
            }
            continue;
        }
        
        // 7. JUMPS (Linear story usually minimal jumps, but handle it just in case)
        if (trimmed.startsWith("[jump")) {
            flushBuffer();
            scriptData.push({ type: "jump", nextLabel: getAttr(trimmed, "next") });
            continue;
        }
    }

    flushBuffer();
    return { scriptData, title: foundTitle };
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

    // 1. Baca daftar file dari folderList.txt
    let FILE_LIST = [];
    try {
        const listContent = fs.readFileSync(FOLDER_LIST_PATH, 'utf-8');
        FILE_LIST = listContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        console.log(`Loaded ${FILE_LIST.length} files from folderList.txt`);
    } catch (err) {
        console.error("Error reading folderList.txt:", err.message);
        process.exit(1);
    }

    const groupedCharacters = {};
    let totalFilesProcessed = 0;

    console.log(`Starting Bond Story sync...`);

    for (let i = 0; i < FILE_LIST.length; i++) {
        const fileName = FILE_LIST[i];
        const assetId = fileName.replace(".txt", ""); 
        
        // Format: adv_bond_[char]_[set]_[ep].txt
        // Contoh: adv_bond_ai_01_01.txt -> char=ai, set=01, ep=01
        const parts = assetId.split("_");
        
        // Validasi format
        if (parts.length < 5) {
            console.warn(`[SKIP] Invalid format: ${fileName}`);
            continue;
        }

        const charCode = parts[2];
        // const setNum = parts[3]; // Biasanya 01 (Bond Story 1?)
        const episodeNum = parseInt(parts[4]); 

        try {
            const buffer = await fetchData(`${R2_TEXT_URL}/${fileName}`);
            const rawContent = buffer.toString("utf-8");
            
            const { scriptData, title } = parseLines(rawContent.replace(/\r\n/g, "\n").split("\n"), assetId);
            
            // Generate Title jika tidak ada di script
            const displayTitle = title || `Episode ${episodeNum}`;

            const jsonFileName = `${assetId}.json`;
            fs.writeFileSync(
                path.join(OUTPUT_DIR, jsonFileName),
                JSON.stringify({
                    id: assetId,
                    title: displayTitle,
                    script: scriptData
                }, null, 2)
            );
            
            totalFilesProcessed++;

            // Grouping Logic
            if (!groupedCharacters[charCode]) {
                const charName = CHARACTER_NAMES[charCode] || charCode.toUpperCase();
                groupedCharacters[charCode] = {
                    id: charCode,
                    name: charName,
                    stories: []
                };
            }

            groupedCharacters[charCode].stories.push({
                id: assetId,
                title: displayTitle,
                epNum: episodeNum, // Untuk sorting
                fileName: jsonFileName
            });

        } catch (err) {
            console.error(`[ERROR] Failed processing ${fileName}:`, err.message);
        }
    }

    // Convert Object to Array & Sort
    const indexData = Object.values(groupedCharacters).map(charGroup => {
        // Sort episodes by number (01, 02, 03...)
        charGroup.stories.sort((a, b) => a.epNum - b.epNum);
        return charGroup;
    }).sort((a, b) => a.id.localeCompare(b.id)); // Sort character by ID

    fs.writeFileSync(path.join(OUTPUT_DIR, "index_bond.json"), JSON.stringify(indexData, null, 2));

    console.log(`\nSync Completed! Processed ${totalFilesProcessed} files.`);
})();