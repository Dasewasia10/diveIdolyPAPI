import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://api.diveidolypapi.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/mainStoryTxt`;
const R2_VOICE_URL = `${R2_DOMAIN}/mainStoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;

const OUTPUT_DIR = path.join(__dirname, "../data/mainstory");
const FOLDER_LIST_PATH = path.join(__dirname, "../data/main_folderList.txt");

// --- MAPPING KARAKTER & GROUP ---
const GROUP_NAMES = {
    "01": "Hoshimi Arc", "02": "Tokyo Arc", "03": "BIG4 Arc", "04": "Starry Sky Arc"
};

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
    "szk": "shizuku", "chs": "chisa", "chk": "chika", "cca": "cocoa", 
    "chn": "chino", "mhk": "miho", "kan": "kana", "kor": "fran",
    "mana": "mana", "saegusa": "saegusa", "asakura": "asakura", "koh": "kohei", "stm": "satomi" 
};

// --- HELPERS ---
const getStartTime = (line) => {
    const match = line.match(/_startTime\\?":\s*([0-9.]+)/);
    return match ? parseFloat(match[1]) : null;
};

// FUNGSI BARU: Mengambil durasi dari attribut clip
const getDuration = (line) => {
    const match = line.match(/_duration\\?":\s*([0-9.]+)/);
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

const resolveBackgroundSrc = (rawSrc) => {
    if (!rawSrc) return null;
    let cleanSrc = rawSrc;
    if (cleanSrc.includes("env_adv_3d_")) {
        cleanSrc = cleanSrc.replace("env_adv_3d_", "env_adv_2d_");
    }
    cleanSrc = cleanSrc.replace(/-000(-|$)/, "$1");
    return `${R2_BG_URL}/${cleanSrc}.webp`;
};

// --- PARSER ---
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

        // 0. TITLE EXTRACTION
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
        if (
            trimmed.startsWith("[backgroundsetting") || 
            trimmed.startsWith("[backgroundtween") ||
            trimmed.startsWith("[backgroundlayoutgroup")
        ) {
            flushBuffer();
            let bgId = null;
            let finalSrc = null;

            if (trimmed.startsWith("[backgroundlayoutgroup")) {
                const layoutMatch = trimmed.match(/backgroundlayout\s+id=([^ \]]+)/);
                if (layoutMatch) bgId = layoutMatch[1];
            } else {
                bgId = getAttr(trimmed, "id");
            }

            if (bgId && backgroundMap[bgId]) {
                finalSrc = resolveBackgroundSrc(backgroundMap[bgId]);
            } else if (bgId) {
                let roughSrc = `env_adv_2d_${bgId.replace("-000", "")}`;
                finalSrc = `${R2_BG_URL}/${roughSrc}.webp`;
            }

            if (finalSrc) {
                scriptData.push({
                    type: "background",
                    src: finalSrc,
                    bgName: bgId || "unknown_bg"
                });
            }
            continue;
        }

        // 3. BGM
        if (trimmed.startsWith("[bgmplay") || (trimmed.startsWith("[bgm ") && !trimmed.startsWith("[bgmstop"))) {
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
                        // Tambahkan properti startTime ke dalam array agar bisa direkalkulasi nanti jika digabung
                        currentDialog.sfxList.push({ src: seSrc, delay: delayMs, startTime: seStartTime });
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
                                lastItem.sfxList.push({ src: seSrc, delay: delayMs, startTime: seStartTime });
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
            
            // HAPUS LOGIKA PENGGABUNGAN MANUAL DI SINI. 
            // Kita serahkan penggabungan sepenuhnya pada tag [voice] nanti.
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

            // Attach Pending SFX
            if (pendingSfx.length > 0) {
                pendingSfx.forEach(sfx => {
                    if (startTime !== null && sfx.startTime !== null && sfx.startTime >= (startTime - 0.5)) {
                        const delayMs = Math.max(0, (sfx.startTime - startTime) * 1000);
                        newDialog.sfxList.push({ src: sfx.src, delay: delayMs, startTime: sfx.startTime });
                    } else {
                        scriptData.push(sfx); 
                    }
                });
                pendingSfx = []; 
            }

            currentDialog = newDialog;
            continue;
        }

        // 6. VOICE & SMART MERGING TIMELINE
        if (trimmed.startsWith("[voice")) {
            const voiceFile = getAttr(trimmed, "voice");
            const actorId = getAttr(trimmed, "actorId");
            const voiceUrl = voiceFile ? `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.m4a` : null;

            // Ambil timeline audio
            const vStart = getStartTime(trimmed);
            const vDur = getDuration(trimmed);
            const vEnd = (vStart !== null && vDur !== null) ? (vStart + vDur) : null;

            if (voiceUrl && vStart !== null && vEnd !== null) {
                let matchingDialogs = [];

                // 1. Cari semua pesan di history scriptData yang masuk ke durasi suara
                for (let j = 0; j < scriptData.length; j++) {
                    const item = scriptData[j];
                    if (item && item.type === "dialogue" && item.startTime !== null) {
                        // Toleransi 0.5 detik
                        if (item.startTime >= vStart - 0.5 && item.startTime <= vEnd + 0.5) {
                            matchingDialogs.push({ source: 'scriptData', index: j, item: item });
                        }
                    }
                }

                // 2. Cari juga di currentDialog (pesan yang baru saja ditangkap)
                if (currentDialog && currentDialog.startTime !== null) {
                    if (currentDialog.startTime >= vStart - 0.5 && currentDialog.startTime <= vEnd + 0.5) {
                        matchingDialogs.push({ source: 'currentDialog', index: -1, item: currentDialog });
                    }
                }

                // 3. LAKUKAN PENGGABUNGAN
                if (matchingDialogs.length > 0) {
                    // Jadikan Dialog TERAKHIR sebagai Induk (Primary)
                    // Mengapa yang terakhir? Agar background/camera yg muncul sebelumnya tetap tereksekusi duluan di layar.
                    const primaryMatch = matchingDialogs[matchingDialogs.length - 1];
                    const primary = primaryMatch.item;

                    primary.voiceUrl = voiceUrl;
                    if (actorId) {
                        const code = actorId.toLowerCase();
                        if (!primary.speakerCode || primary.speakerCode === "unknown") {
                            primary.speakerCode = code;
                            if (!primary.iconUrl && ICON_MAP[code]) {
                                primary.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
                            }
                        }
                    }

                    // Gabung teks & rekalkulasi jeda SFX
                    let mergedText = "";
                    let mergedSfx = [];
                    // SFX dihitung relatif terhadap Dialog PERTAMA, karena Audio jalan sejak saat itu.
                    const baseStartTime = matchingDialogs[0].item.startTime; 

                    for (let k = 0; k < matchingDialogs.length; k++) {
                        const matchObj = matchingDialogs[k];
                        const item = matchObj.item;

                        // Gabung Teks
                        mergedText += (mergedText ? "\n" : "") + (item.text || "");

                        // Rekalkulasi SFX Delay
                        if (item.sfxList && item.sfxList.length > 0) {
                            item.sfxList.forEach(sfx => {
                                let newDelay = 0;
                                if (sfx.startTime !== undefined && baseStartTime !== null) {
                                    newDelay = Math.max(0, (sfx.startTime - baseStartTime) * 1000);
                                } else {
                                    newDelay = sfx.delay;
                                }
                                mergedSfx.push({ ...sfx, delay: newDelay, startTime: sfx.startTime });
                            });
                        }

                        // HAPUS dialog pecahan (kecuali si Induk) dari buffer
                        if (k !== matchingDialogs.length - 1) {
                            if (matchObj.source === 'scriptData') {
                                scriptData[matchObj.index] = null; // Tandai untuk dihapus
                            } else if (matchObj.source === 'currentDialog') {
                                currentDialog = null;
                            }
                        }
                    }

                    primary.text = mergedText;
                    primary.sfxList = mergedSfx;

                    // Bersihkan `null` dari scriptData
                    for (let i = scriptData.length - 1; i >= 0; i--) {
                        if (scriptData[i] === null) {
                            scriptData.splice(i, 1);
                        }
                    }
                } else {
                    // Fallback (jika audio tidak punya dialog yg cocok)
                    let target = currentDialog;
                    if (!target && scriptData.length > 0) {
                        for (let j = scriptData.length - 1; j >= 0; j--) {
                            if (scriptData[j] && scriptData[j].type === "dialogue") {
                                target = scriptData[j];
                                break; 
                            }
                        }
                    }
                    if (target) {
                        target.voiceUrl = voiceUrl;
                    }
                }
            } else {
                // Fallback (jika vStart atau vEnd gagal diparsing)
                let target = currentDialog;
                if (!target && scriptData.length > 0) {
                    for (let j = scriptData.length - 1; j >= 0; j--) {
                        if (scriptData[j] && scriptData[j].type === "dialogue") {
                            target = scriptData[j];
                            break; 
                        }
                    }
                }
                if (target) {
                    target.voiceUrl = voiceUrl;
                }
            }
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

    let FILE_LIST = [];
    try {
        const listContent = fs.readFileSync(FOLDER_LIST_PATH, 'utf-8');
        FILE_LIST = listContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        console.log(`Loaded ${FILE_LIST.length} files from folderList.txt`);
    } catch (err) {
        console.error("Error reading folderList.txt:", err.message);
        process.exit(1);
    }

    const groupedGroups = {};
    let totalFilesProcessed = 0;

    console.log(`Starting Main Story sync...`);

    for (let i = 0; i < FILE_LIST.length; i++) {
        const fileName = FILE_LIST[i];
        const assetId = fileName.replace(".txt", ""); 
        
        const parts = assetId.split("_");
        
        if (parts.length < 5) {
            console.warn(`[SKIP] Invalid format: ${fileName}`);
            continue;
        }

        const groupCode = parts[2];
        const setNum = parts[3];
        const episodeNum = parts[4]; 

        try {
            const buffer = await fetchData(`${R2_TEXT_URL}/${fileName}`);
            const rawContent = buffer.toString("utf-8");
            
            const { scriptData, title } = parseLines(rawContent.replace(/\r\n/g, "\n").split("\n"), assetId);
            
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

            if (!groupedGroups[groupCode]) {
                const groupName = GROUP_NAMES[groupCode] || groupCode.toUpperCase();
                groupedGroups[groupCode] = {
                    id: groupCode,
                    name: groupName,
                    stories: []
                };
            }

            const epNumIndex = parseInt(setNum) * 10 + parseInt(episodeNum);

            groupedGroups[groupCode].stories.push({
                id: assetId,
                title: displayTitle,
                epNum: epNumIndex,
                fileName: jsonFileName
            });

        } catch (err) {
            console.error(`[ERROR] Failed processing ${fileName}:`, err.message);
        }
    }

    const indexData = Object.values(groupedGroups).map(groupGroup => {
        groupGroup.stories.sort((a, b) => a.epNum - b.epNum);
        return groupGroup;
    }).sort((a, b) => a.id.localeCompare(b.id));

    fs.writeFileSync(path.join(OUTPUT_DIR, "index_main.json"), JSON.stringify(indexData, null, 2));

    console.log(`\nSync Completed! Processed ${totalFilesProcessed} files.`);
})();