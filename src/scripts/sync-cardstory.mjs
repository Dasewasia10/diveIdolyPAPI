import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://apiip.dasewasia.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/cardStoryTxt`;
const R2_VOICE_URL = `${R2_DOMAIN}/cardStoryVoice`;

const OUTPUT_DIR = path.join(__dirname, "../data/cardstory");
const DETAIL_DIR = path.join(OUTPUT_DIR, "detail");

const FOLDER_LIST_PATH = path.join(__dirname, "../data/card_folderList.txt");
const CARD_SOURCES_PATH = path.join(__dirname, "../data/card/cardSources.json");

// URL Master DB untuk mengambil Story.json
const BASE_URL =
  "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";

// --- MAPPING KARAKTER ---
const SPEAKER_MAP = {
  rio: "Rio Kanzaki",
  aoi: "Aoi Igawa",
  ai: "Ai Komiyama",
  kkr: "Kokoro Akazaki",
  rui: "Rui Tendo",
  yu: "Yuu Suzumura",
  smr: "Sumire Okuyama",
  mna: "Mana Nagase",
  ktn: "Kotono Nagase",
  skr: "Sakura Kawasaki",
  rei: "Rei Ichinose",
  ngs: "Nagisa Ibuki",
  hrk: "Haruko Saeki",
  ski: "Saki Shiraishi",
  suz: "Suzu Narumiya",
  mei: "Mei Hayasaka",
  szk: "Shizuku Hyodo",
  chs: "Chisa Shiraishi",
  mhk: "Miho",
  kan: "Kana",
  kor: "Fran",
  koh: "{user}",
  system: "System",
};

const ICON_MAP = {
  rio: "rio",
  aoi: "aoi",
  ai: "ai",
  kkr: "kokoro",
  rui: "rui",
  yu: "yu",
  smr: "sumire",
  mna: "mana",
  ktn: "kotono",
  skr: "sakura",
  rei: "rei",
  ngs: "nagisa",
  hrk: "haruko",
  ski: "saki",
  suz: "suzu",
  mei: "mei",
  szk: "shizuku",
  chs: "chisa",
  mhk: "miho",
  kan: "kana",
  kor: "fran",
  koh: "makino",
  system: null,
};

// --- HELPERS ---
const getStartTime = (line) => {
  const match = line.match(/_startTime\\?":\s*([0-9.]+)/);
  return match ? parseFloat(match[1]) : null;
};

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
  const nextAttrRegex =
    /\s+(name|voice|clip|hide|actorId|window|thumbnial|thumbnail)=/i;
  const nextMatch = rest.match(nextAttrRegex);
  let content = nextMatch
    ? rest.substring(0, nextMatch.index)
    : rest.replace(/\s*\]\s*$/, "");
  return content.trim();
};

// --- PARSER ---
const parseLinesToChat = (lines, assetId) => {
  const details = [];
  let foundTitle = "Unknown Chapter";
  let msgCounter = 1;

  const rawDialogs = [];
  const rawVoices = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Menangkap Tittle secara utuh (Fix spasial)
    if (trimmed.startsWith("[title")) {
      const titleMatch = trimmed.match(/title=([^\]]+)/);
      if (titleMatch) foundTitle = titleMatch[1].trim();
      continue;
    }

    if (trimmed.startsWith("[message") || trimmed.startsWith("[narration")) {
      const isNarration = trimmed.startsWith("[narration");
      let inlineText = extractMessageText(trimmed);
      if (inlineText) inlineText = inlineText.replace(/\\n/g, "\n");

      let displayName = getAttr(trimmed, "name");
      let speakerCode = getAttr(trimmed, "window");

      const thumbRaw =
        getAttr(trimmed, "thumbnial") || getAttr(trimmed, "thumbnail");
      if (thumbRaw) {
        const match = thumbRaw.match(/img_chr_adv_([a-z0-9]+)-/i);
        if (match) speakerCode = match[1];
      }

      if (isNarration) {
        speakerCode = "system";
        displayName = "";
      }

      if (!speakerCode) speakerCode = "unknown";
      speakerCode = speakerCode.toLowerCase();

      let isPlayer = speakerCode === "koh" || displayName === "{user}";

      if (!displayName && SPEAKER_MAP[speakerCode]) {
        displayName = SPEAKER_MAP[speakerCode];
      }

      let iconUrl = null;
      if (ICON_MAP[speakerCode]) {
        iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[speakerCode]}.png`;
      }

      const startTime = getStartTime(trimmed);

      rawDialogs.push({
        id: `msg_${msgCounter++}`,
        speaker: {
          isPlayer,
          characterId: speakerCode,
          icon: iconUrl,
          name: displayName || "Unknown",
        },
        text: inlineText || "...",
        isChoice: false,
        stamp: null,
        image: null,
        voiceUrl: null,
        _startTime: startTime,
      });
    }

    if (trimmed.startsWith("[voice")) {
      const voiceFile = getAttr(trimmed, "voice");
      const vStart = getStartTime(trimmed);
      const vDur = getDuration(trimmed);

      if (voiceFile && vStart !== null) {
        rawVoices.push({
          voiceUrl: `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.m4a`,
          start: vStart,
          end: vStart + (vDur || 5),
        });
      }
    }
  }

  rawDialogs.forEach((dialog) => {
    if (dialog._startTime !== null) {
      const matchingVoice = rawVoices.find(
        (v) =>
          dialog._startTime >= v.start - 0.5 &&
          dialog._startTime <= v.end + 0.5,
      );
      if (matchingVoice) {
        dialog.voiceUrl = matchingVoice.voiceUrl;
      }
    }
    delete dialog._startTime;
    details.push(dialog);
  });

  return { title: foundTitle, details };
};

// --- MAIN EXECUTION ---
(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(DETAIL_DIR)) fs.mkdirSync(DETAIL_DIR, { recursive: true });

  console.log(`Mulai sinkronisasi Card Story ke bentuk Chat...`);

  // --- 1. MEMUAT FILE_LIST DARI TXT ---
  let FILE_LIST = [];
  try {
    const listContent = fs.readFileSync(FOLDER_LIST_PATH, "utf-8");
    FILE_LIST = listContent
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("//"));
  } catch (err) {
    console.error(`[ERROR] Gagal membaca list file di ${FOLDER_LIST_PATH}`);
    process.exit(1);
  }

  // --- 2. MEMUAT DATA KARTU LOKAL (cardSources.json) ---
  const cardMap = {};
  try {
    const cardSources = JSON.parse(fs.readFileSync(CARD_SOURCES_PATH, "utf-8"));
    cardSources.forEach((char) => {
      char.data.forEach((card) => {
        cardMap[card.uniqueId] = card;
      });
    });
    console.log(
      `[OK] Memuat ${Object.keys(cardMap).length} data dari cardSources.json`,
    );
  } catch (err) {
    console.error(`[WARNING] Gagal memuat cardSources.json: ${err.message}`);
  }

  // --- 3. MENGAMBIL Story.json DARI GITHUB UNTUK MAPPING ---
  const assetToCardId = {};
  try {
    console.log(`Mengambil Story.json dari Master Diff...`);
    const storyRes = await fetch(`${BASE_URL}/Story.json`);
    const storyData = await storyRes.json();

    storyData.forEach((story) => {
      if (story.id && story.id.startsWith("st-card-")) {
        // Contoh ID: st-card-ai-05-idol-00-01
        const parts = story.id.split("-");
        if (parts.length >= 6) {
          const uniqueId = parts.slice(2, 6).join("-"); // Mendapatkan: ai-05-idol-00
          if (story.advAssetIds && story.advAssetIds.length > 0) {
            story.advAssetIds.forEach((asset) => {
              assetToCardId[asset] = uniqueId; // card_ai_01_01 -> ai-05-idol-00
            });
          }
        }
      }
    });
    console.log(`[OK] Berhasil membuat mapping dari Story.json`);
  } catch (err) {
    console.error(`[ERROR] Gagal memuat Story.json dari GitHub:`, err.message);
  }

  // Struktur penampung untuk index.json
  const groupsMap = {};

  // --- 4. PROSES PARSING ---
  for (let fileName of FILE_LIST) {
    const assetId = fileName.replace(".txt", "");
    const parts = assetId.split("_");
    if (parts.length < 5) continue;

    const charCode = parts[2];
    const cardNum = parts[3];
    const groupId = `card_${charCode}_${cardNum}`;

    try {
      const response = await fetch(`${R2_TEXT_URL}/${fileName}`);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const rawContent = await response.text();

      const { title, details } = parseLinesToChat(
        rawContent.replace(/\r\n/g, "\n").split("\n"),
        assetId,
      );

      // Deteksi versi short
      const isShort = assetId.endsWith("_short");
      const displayTitle = isShort ? `${title} (Short)` : title;

      // Buat file detail chat
      const detailData = {
        id: assetId,
        groupId: groupId,
        name: displayTitle,
        background: null,
        details: details,
      };

      fs.writeFileSync(
        path.join(DETAIL_DIR, `${assetId}.json`),
        JSON.stringify(detailData, null, 2),
      );

      // Kumpulkan data ke index
      if (!groupsMap[groupId]) {
        // Proses Mapping ID Kartu dari nama txt (contoh: adv_card_ai_01_01 -> card_ai_01_01)
        const baseAssetId = assetId.replace(/^adv_/, "").replace(/_short$/, "");
        const matchedUniqueId = assetToCardId[baseAssetId];

        let groupTitle = `[Story] ${SPEAKER_MAP[charCode] || charCode.toUpperCase()} Card ${cardNum}`;
        let groupIcon = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[charCode] || charCode}.png`;

        if (matchedUniqueId && cardMap[matchedUniqueId]) {
          // --- BERHASIL TERSAMBUNG KE DATABASE KARTU ---
          const cardInfo = cardMap[matchedUniqueId];
          groupTitle = cardInfo.title.japanese; // Ganti ke .indo jika ingin memakai bahasa Indonesia
          groupIcon = cardInfo.images.icon; // Memakai ikon kartu!
        } else {
          // Fallback ke pemotongan spasi jika mapping gagal (misal file baru)
          if (title) {
            const titleMatch = title.match(/^(.*?\s+\d+話)/);
            if (titleMatch && titleMatch[1]) {
              groupTitle = titleMatch[1];
            } else {
              groupTitle = title;
            }
          }
        }

        groupsMap[groupId] = {
          id: groupId,
          title: groupTitle,
          groupIcon: groupIcon,
          characterIds: [charCode, "koh"],
          messages: [],
        };
      }

      groupsMap[groupId].messages.push({
        id: assetId,
        title: displayTitle,
        type: 0,
        isShort: isShort, // Untuk sorting nanti
      });

      console.log(
        `[OK] Diproses: ${assetId} -> Ter-map: ${groupsMap[groupId].title}`,
      );
    } catch (error) {
      console.error(`[ERROR] Gagal memproses ${fileName}:`, error.message);
    }
  }

  // --- 5. SORTING PESAN DI DALAM GRUP (Short ke Bawah) ---
  for (const groupId in groupsMap) {
    groupsMap[groupId].messages.sort((a, b) => {
      if (a.isShort && !b.isShort) return 1;
      if (!a.isShort && b.isShort) return -1;
      return a.id.localeCompare(b.id);
    });

    // Bersihkan metadata internal
    groupsMap[groupId].messages.forEach((msg) => delete msg.isShort);
  }

  const indexArray = Object.values(groupsMap).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "index.json"),
    JSON.stringify(indexArray, null, 2),
  );

  console.log(`\nSelesai! Index dan Detail berhasil dibuat di: ${OUTPUT_DIR}`);
})();
