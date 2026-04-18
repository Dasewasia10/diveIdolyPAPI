import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://apiip.dasewasia.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/cardStoryTxt`;
const R2_VOICE_URL = `${R2_DOMAIN}/cardStoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`; 
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`; 

const OUTPUT_DIR = path.join(__dirname, "../data/cardstory");
const DETAIL_DIR = path.join(OUTPUT_DIR, "detail");

const FOLDER_LIST_PATH = path.join(__dirname, "../data/card_folderList.txt");
const CARD_SOURCES_PATH = path.join(__dirname, "../data/card/cardSources.json");

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
  let content = "";
  if (nextMatch) content = rest.substring(0, nextMatch.index);
  else content = rest.replace(/\s*\]\s*$/, "");
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

// --- PARSER (DIADOPSI DARI MAINSTORY) ---
const parseLines = (lines, assetId) => {
  const scriptData = [];
  const backgroundMap = {};
  let currentDialog = null;
  let pendingSfx = [];
  let foundTitle = null;

  const flushBuffer = () => {
    if (pendingSfx.length > 0) {
      pendingSfx.forEach((sfxObj) => scriptData.push(sfxObj));
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

    if (trimmed.startsWith("[title")) {
      // Menangkap seluruh string untuk judul termasuk jika ada spasi di dalamnya
      const match = trimmed.match(/title=([^\]]+)/i);
      if (match) {
        foundTitle = match[1].trim();
      }
      continue;
    }

    if (trimmed.startsWith("[backgroundgroup")) {
      const bgRegex = /id=([^ ]+)\s+src=([^ \]]+)/g;
      let match;
      while ((match = bgRegex.exec(trimmed)) !== null) {
        backgroundMap[match[1]] = match[2];
      }
      continue;
    }

    if (
      trimmed.startsWith("[backgroundsetting") ||
      trimmed.startsWith("[backgroundtween") ||
      trimmed.startsWith("[backgroundlayoutgroup")
    ) {
      flushBuffer();
      let bgId = null;
      let finalSrc = null;
      const startTime = getStartTime(trimmed);

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
          bgName: bgId || "unknown_bg",
          startTime: startTime,
        });
      }
      continue;
    }

    if (trimmed.startsWith("[bgmplay")) {
      flushBuffer();
      const bgmId = getAttr(trimmed, "bgm");
      const startTime = getStartTime(trimmed);
      if (bgmId) {
        scriptData.push({
          type: "bgm",
          action: "play",
          src: `${R2_BGM_URL}/${bgmId}.m4a`,
          startTime: startTime,
        });
      }
      continue;
    }

    if (trimmed.startsWith("[bgmstop")) {
      flushBuffer();
      const startTime = getStartTime(trimmed);
      scriptData.push({ type: "bgm", action: "stop", startTime: startTime });
      continue;
    }

    if (trimmed.startsWith("[se")) {
      const seId = getAttr(trimmed, "se");
      const seStartTime = getStartTime(trimmed);
      const seSrc = seId ? `${R2_BGM_URL}/${seId}.m4a` : null;

      if (seId && seSrc) {
        const sfxItem = { type: "sfx", src: seSrc, startTime: seStartTime };
        let attached = false;

        if (
          currentDialog &&
          currentDialog.startTime !== null &&
          seStartTime !== null
        ) {
          if (seStartTime >= currentDialog.startTime - 0.5) {
            const delayMs = Math.max(
              0,
              (seStartTime - currentDialog.startTime) * 1000,
            );
            currentDialog.sfxList.push({
              src: seSrc,
              delay: delayMs,
              startTime: seStartTime,
            });
            attached = true;
          }
        }

        if (!attached && scriptData.length > 0) {
          for (let j = scriptData.length - 1; j >= 0; j--) {
            const lastItem = scriptData[j];
            if (lastItem.type === "bgm" && lastItem.action === "stop") break;
            if (lastItem.type === "dialogue") {
              if (
                seStartTime !== null &&
                lastItem.startTime !== null &&
                seStartTime >= lastItem.startTime - 0.5
              ) {
                const delayMs = Math.max(
                  0,
                  (seStartTime - lastItem.startTime) * 1000,
                );
                if (!lastItem.sfxList) lastItem.sfxList = [];
                lastItem.sfxList.push({
                  src: seSrc,
                  delay: delayMs,
                  startTime: seStartTime,
                });
                attached = true;
              }
              break;
            }
          }
        }
        if (!attached) pendingSfx.push(sfxItem);
      }
      continue;
    }

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

      const thumbRaw =
        getAttr(trimmed, "thumbnial") || getAttr(trimmed, "thumbnail");
      if (thumbRaw) {
        const match = thumbRaw.match(/img_chr_adv_([a-z0-9]+)-/i);
        if (match) speakerCode = match[1];
      }

      if (!speakerCode && !isNarration) speakerCode = "unknown";
      if (isNarration) speakerCode = null;
      if (speakerCode) speakerCode = speakerCode.toLowerCase();

      if (!displayName && speakerCode && SPEAKER_MAP[speakerCode])
        displayName = SPEAKER_MAP[speakerCode];
      if (speakerCode && ICON_MAP[speakerCode])
        iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[speakerCode]}.png`;
      else if (speakerCode && speakerCode !== "unknown" && !isNarration)
        iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${speakerCode}.png`;

      const startTime = getStartTime(trimmed);
      const newDialog = {
        type: "dialogue",
        speakerCode,
        speakerName: displayName,
        iconUrl,
        voiceUrl: null,
        text: inlineText || "",
        startTime: startTime,
        sfxList: [],
      };

      if (pendingSfx.length > 0) {
        pendingSfx.forEach((sfx) => {
          if (
            startTime !== null &&
            sfx.startTime !== null &&
            sfx.startTime >= startTime - 0.5
          ) {
            const delayMs = Math.max(0, (sfx.startTime - startTime) * 1000);
            newDialog.sfxList.push({
              src: sfx.src,
              delay: delayMs,
              startTime: sfx.startTime,
            });
          } else scriptData.push(sfx);
        });
        pendingSfx = [];
      }
      currentDialog = newDialog;
      continue;
    }

    if (trimmed.startsWith("[voice")) {
      const voiceFile = getAttr(trimmed, "voice");
      const actorId = getAttr(trimmed, "actorId");
      const voiceUrl = voiceFile
        ? `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.m4a`
        : null;

      const vStart = getStartTime(trimmed);
      const vDur = getDuration(trimmed);
      const vEnd = vStart !== null && vDur !== null ? vStart + vDur : null;

      if (voiceUrl && vStart !== null && vEnd !== null) {
        let matchingDialogs = [];
        for (let j = 0; j < scriptData.length; j++) {
          const item = scriptData[j];
          if (item && item.type === "dialogue" && item.startTime !== null) {
            if (
              item.startTime >= vStart - 0.5 &&
              item.startTime <= vEnd + 0.5
            ) {
              matchingDialogs.push({
                source: "scriptData",
                index: j,
                item: item,
              });
            }
          }
        }

        if (currentDialog && currentDialog.startTime !== null) {
          if (
            currentDialog.startTime >= vStart - 0.5 &&
            currentDialog.startTime <= vEnd + 0.5
          ) {
            matchingDialogs.push({
              source: "currentDialog",
              index: -1,
              item: currentDialog,
            });
          }
        }

        if (matchingDialogs.length > 0) {
          const primaryMatch = matchingDialogs[matchingDialogs.length - 1];
          const primary = primaryMatch.item;
          primary.voiceUrl = voiceUrl;

          if (actorId) {
            const code = actorId.toLowerCase();
            if (!primary.speakerCode || primary.speakerCode === "unknown") {
              primary.speakerCode = code;
              if (!primary.iconUrl && ICON_MAP[code])
                primary.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
            }
          }

          let mergedText = "";
          let mergedSfx = [];
          const baseStartTime = matchingDialogs[0].item.startTime;

          for (let k = 0; k < matchingDialogs.length; k++) {
            const matchObj = matchingDialogs[k];
            const item = matchObj.item;
            mergedText += (mergedText ? "\n" : "") + (item.text || "");

            if (item.sfxList && item.sfxList.length > 0) {
              item.sfxList.forEach((sfx) => {
                let newDelay =
                  sfx.startTime !== undefined && baseStartTime !== null
                    ? Math.max(0, (sfx.startTime - baseStartTime) * 1000)
                    : sfx.delay;
                mergedSfx.push({
                  ...sfx,
                  delay: newDelay,
                  startTime: sfx.startTime,
                });
              });
            }

            if (k !== matchingDialogs.length - 1) {
              if (matchObj.source === "scriptData")
                scriptData[matchObj.index] = null;
              else if (matchObj.source === "currentDialog")
                currentDialog = null;
            }
          }

          primary.text = mergedText;
          primary.sfxList = mergedSfx;

          for (let i = scriptData.length - 1; i >= 0; i--) {
            if (scriptData[i] === null) scriptData.splice(i, 1);
          }
        } else {
          let target = currentDialog;
          if (!target && scriptData.length > 0) {
            for (let j = scriptData.length - 1; j >= 0; j--) {
              if (scriptData[j] && scriptData[j].type === "dialogue") {
                target = scriptData[j];
                break;
              }
            }
          }
          if (target) target.voiceUrl = voiceUrl;
        }
      } else {
        let target = currentDialog;
        if (!target && scriptData.length > 0) {
          for (let j = scriptData.length - 1; j >= 0; j--) {
            if (scriptData[j] && scriptData[j].type === "dialogue") {
              target = scriptData[j];
              break;
            }
          }
        }
        if (target) target.voiceUrl = voiceUrl;
      }
      continue;
    }
  }
  flushBuffer();

  scriptData.sort((a, b) => {
    const timeA =
      a.startTime !== undefined && a.startTime !== null
        ? parseFloat(a.startTime)
        : 0;
    const timeB =
      b.startTime !== undefined && b.startTime !== null
        ? parseFloat(b.startTime)
        : 0;
    return timeA - timeB;
  });

  return { scriptData, title: foundTitle };
};

// --- MAIN EXECUTION ---
(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(DETAIL_DIR)) fs.mkdirSync(DETAIL_DIR, { recursive: true });

  console.log(
    `Mulai sinkronisasi Card Story menggunakan Visual Novel Parser...`,
  );

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

  // --- BACA CACHE LAMA ---
  const INDEX_PATH = path.join(OUTPUT_DIR, "index.json");
  const cacheMap = {};
  let cachedFilesCount = 0;
  if (fs.existsSync(INDEX_PATH)) {
    const oldIndex = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
    oldIndex.forEach((group) => {
      group.stories.forEach((story) => {
        cacheMap[story.id] = story;
      });
    });
    console.log(
      `[CACHE] Ditemukan ${Object.keys(cacheMap).length} cerita di index lama.`,
    );
  }

  const cardMap = {};
  try {
    const cardSources = JSON.parse(fs.readFileSync(CARD_SOURCES_PATH, "utf-8"));
    cardSources.forEach((char) => {
      char.data.forEach((card) => {
        cardMap[card.uniqueId] = card;
      });
    });
  } catch (err) {
    console.error(`[WARNING] Gagal memuat cardSources.json: ${err.message}`);
  }

  const assetToCardId = {};
  try {
    console.log(`Mengambil Story.json dari Master Diff...`);
    const storyData = await (await fetch(`${BASE_URL}/Story.json`)).json();
    storyData.forEach((story) => {
      if (story.id && story.id.startsWith("st-card-")) {
        const parts = story.id.split("-");
        if (parts.length >= 6) {
          const uniqueId = parts.slice(2, 6).join("-");
          if (story.advAssetIds) {
            story.advAssetIds.forEach((asset) => {
              assetToCardId[asset] = uniqueId;
            });
          }
        }
      }
    });
  } catch (err) {
    console.error(`[ERROR] Gagal memuat Story.json dari GitHub:`, err.message);
  }

  const groupsMap = {};

  for (let fileName of FILE_LIST) {
    const assetId = fileName.replace(".txt", "");
    const parts = assetId.split("_");
    if (parts.length < 5) continue;

    const charCode = parts[2];
    const cardNum = parts[3];
    const groupId = `card_${charCode}_${cardNum}`;
    const jsonFileName = `${assetId}.json`;

    // --- CEK CACHE ---
    if (
      cacheMap[assetId] &&
      fs.existsSync(path.join(DETAIL_DIR, jsonFileName))
    ) {
      // Pastikan grupnya ada
      if (!groupsMap[groupId]) {
        groupsMap[groupId] = {
          id: groupId,
          title: `[Story] ${SPEAKER_MAP[charCode] || charCode.toUpperCase()} Card ${cardNum}`,
          groupIcon: `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[charCode] || charCode}.png`,
          stories: [],
        };
      }

      groupsMap[groupId].stories.push(cacheMap[assetId]);
      cachedFilesCount++;
      continue;
    }

    try {
      const response = await fetch(`${R2_TEXT_URL}/${fileName}`);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const rawContent = await response.text();

      // PARSING MENGGUNAKAN MESIN VN
      const { scriptData, title } = parseLines(
        rawContent.replace(/\r\n/g, "\n").split("\n"),
        assetId,
      );

      const isShort = assetId.endsWith("_short");
      const displayTitle = isShort
        ? `${title || "Story"} (Short)`
        : title || "Story";

      // SIMPAN FILE DETAIL DENGAN FORMAT SCRIPT VN { id, title, script: [] }
      const detailData = {
        id: assetId,
        title: displayTitle,
        script: scriptData,
      };

      fs.writeFileSync(
        path.join(DETAIL_DIR, `${assetId}.json`),
        JSON.stringify(detailData, null, 2),
      );

      // INDEXING
      if (!groupsMap[groupId]) {
        // Hanya membuang '_short' di akhir karena mapping Story.json membutuhkan string utuh 'adv_card_...'
        const baseAssetId = assetId.replace(/_short$/, "");
        const matchedUniqueId = assetToCardId[baseAssetId];

        let groupTitle = `[Story] ${SPEAKER_MAP[charCode] || charCode.toUpperCase()} Card ${cardNum}`;
        let groupIcon = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[charCode] || charCode}.png`;

        if (matchedUniqueId && cardMap[matchedUniqueId]) {
          const cardData = cardMap[matchedUniqueId];
          groupTitle = cardData.title.japanese;
          
          // Memanfaatkan initialTitle atau uniqueId secara langsung untuk base name gambar
          const uniqueTitle = cardData.initialTitle || cardData.uniqueId;
          groupIcon = `${R2_DOMAIN}/cardThumb/img_card_thumb_0_${uniqueTitle}.webp`;
        } else if (title) {
          const titleMatch = title.match(/^(.*?\s+\d+話)/);
          groupTitle = titleMatch && titleMatch[1] ? titleMatch[1] : title;
        }

        groupsMap[groupId] = {
          id: groupId,
          title: groupTitle,
          groupIcon: groupIcon,
          stories: [], // Diseragamkan menjadi 'stories'
        };
      }

      groupsMap[groupId].stories.push({
        id: assetId,
        title: displayTitle,
        fileName: `${assetId}.json`, 
        isShort: isShort,
      });

      console.log(
        `[OK] Diproses: ${assetId} -> Ter-map: ${groupsMap[groupId].title}`,
      );
    } catch (error) {
      console.error(`[ERROR] Gagal memproses ${fileName}:`, error.message);
    }
  }

  for (const groupId in groupsMap) {
    groupsMap[groupId].stories.sort((a, b) => {
      if (a.isShort && !b.isShort) return 1;
      if (!a.isShort && b.isShort) return -1;
      return a.id.localeCompare(b.id);
    });
    groupsMap[groupId].stories.forEach((msg) => delete msg.isShort);
  }

  const indexArray = Object.values(groupsMap).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "index.json"),
    JSON.stringify(indexArray, null, 2),
  );

  console.log(
    `\nSelesai! Card Story telah disinkronkan ke dalam format Visual Novel!`,
  );
})();