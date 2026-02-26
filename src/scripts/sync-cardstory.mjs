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

// Output folder disesuaikan dengan struktur frontend (index di luar, detail di dalam folder)
const OUTPUT_DIR = path.join(__dirname, "../data/cardstory");
const DETAIL_DIR = path.join(OUTPUT_DIR, "detail");

const FOLDER_LIST_PATH = path.join(__dirname, "../data/card_folderList.txt");

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
  koh: "{user}", // Koh adalah Manager / Player
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

  // Temporary arrays untuk menggabungkan voice yang berjalan paralel dengan teks
  const rawDialogs = [];
  const rawVoices = [];

  // Tahap 1: Ekstraksi Teks dan Audio mentah
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[title")) {
      foundTitle = getAttr(trimmed, "title");
      continue;
    }

    // Narration atau Message -> Jadikan ChatDetail dasar
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

    // Ekstrak Data Suara
    if (trimmed.startsWith("[voice")) {
      const voiceFile = getAttr(trimmed, "voice");
      const vStart = getStartTime(trimmed);
      const vDur = getDuration(trimmed);

      if (voiceFile && vStart !== null) {
        rawVoices.push({
          voiceUrl: `${R2_VOICE_URL}/${assetId}/${voiceFile}.m4a`, // Ekstensi disesuaikan
          start: vStart,
          end: vStart + (vDur || 5), // Fallback durasi jika tidak ada
        });
      }
    }
  }

  // Tahap 2: Gabungkan Voice ke Dialog berdasarkan Timeline (Overlap Waktu)
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
    // Hapus properti internal sebelum dikembalikan
    delete dialog._startTime;
    details.push(dialog);
  });

  return { title: foundTitle, details };
};

// --- FETCH DATA ---
const fetchData = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200)
          return reject(new Error(`Failed ${url}: ${res.statusCode}`));
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
};

// --- MAIN EXECUTION ---
(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(DETAIL_DIR)) fs.mkdirSync(DETAIL_DIR, { recursive: true });

  console.log(`Mulai sinkronisasi Card Story ke bentuk Chat...`);

  // --- TAMBAHKAN BAGIAN INI UNTUK MEMBACA FILE_LIST DARI TXT ---
  let FILE_LIST = [];
  try {
    const listContent = fs.readFileSync(FOLDER_LIST_PATH, "utf-8");
    FILE_LIST = listContent
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("//")); // Abaikan baris kosong dan komentar
  } catch (err) {
    console.error(
      `[ERROR] Gagal membaca list file di ${FOLDER_LIST_PATH}:`,
      err.message,
    );
    process.exit(1); // Hentikan script jika file list tidak ditemukan
  }

  // Struktur penampung untuk index.json
  const groupsMap = {};

  for (let fileName of FILE_LIST) {
    const assetId = fileName.replace(".txt", "");

    // Asumsi format: adv_card_ai_01_01
    // Pisahkan untuk mendapatkan ID Grup (misal: card_ai_01)
    const parts = assetId.split("_");
    if (parts.length < 5) continue;

    const charCode = parts[2]; // ai
    const cardNum = parts[3]; // 01
    const groupId = `card_${charCode}_${cardNum}`;

    try {
      const buffer = await fetchData(`${R2_TEXT_URL}/${fileName}`);
      const rawContent = buffer.toString("utf-8");

      const { title, details } = parseLinesToChat(
        rawContent.replace(/\r\n/g, "\n").split("\n"),
        assetId,
      );

      // 1. Simpan file detail (chat content)
      const detailData = {
        id: assetId,
        groupId: groupId,
        name: title,
        background: null, // Chat background biasanya tidak dinamis per chat, diset null
        details: details,
      };

      fs.writeFileSync(
        path.join(DETAIL_DIR, `${assetId}.json`),
        JSON.stringify(detailData, null, 2),
      );

      // 2. Kumpulkan data untuk Index
      if (!groupsMap[groupId]) {
        groupsMap[groupId] = {
          id: groupId,
          title: `[Story] ${SPEAKER_MAP[charCode] || charCode.toUpperCase()} Card ${cardNum}`,
          groupIcon: `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[charCode] || charCode}.png`,
          characterIds: [charCode, "koh"],
          messages: [],
        };
      }

      groupsMap[groupId].messages.push({
        id: assetId,
        title: title,
        type: 0, // Asumsi tipe normal chat
      });

      console.log(`[OK] Diproses: ${assetId}`);
    } catch (error) {
      console.error(`[ERROR] Gagal memproses ${fileName}:`, error.message);
    }
  }

  // 3. Simpan file index.json
  const indexArray = Object.values(groupsMap).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "index.json"),
    JSON.stringify(indexArray, null, 2),
  );

  console.log(`\nSelesai! Index dan Detail berhasil dibuat di: ${OUTPUT_DIR}`);
})();
