import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://apiip.dasewasia.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/bondStoryTxt`;
const R2_TEXT_EN_URL = `${R2_DOMAIN}/bondStoryTxtGlobal`;
const R2_VOICE_URL = `${R2_DOMAIN}/bondStoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;

const OUTPUT_DIR = path.join(__dirname, "../data/bondstory");
const FOLDER_LIST_PATH = path.join(__dirname, "../data/bond_folderList.txt");

// --- MAPPING KARAKTER (Bisa dilengkapi) ---
const CHARACTER_NAMES = {
  ai: "Ai Komiyama",
  aoi: "Aoi Igawa",
  chs: "Chisa Shiraishi",
  hrk: "Haruko Saeki",
  kkr: "Kokoro Akazaki",
  ktn: "Kotono Nagase",
  mei: "Mei Hayasaka",
  mna: "Mana Nagase",
  ngs: "Nagisa Ibuki",
  rei: "Rei Ichinose",
  rio: "Rio Kanzaki",
  rui: "Rui Tendo",
  ski: "Saki Shiraishi",
  skr: "Sakura Kawasaki",
  smr: "Sumire Okuyama",
  suz: "Suzu Narumiya",
  szk: "Shizuku Hyodo",
  yu: "Yuu Suzumura",
  kan: "Kana Kojima a.k.a kana",
  mhk: "Mihoko Takeda a.k.a miho",
  kor: "Kaori (Franziska) Yamada a.k.a fran",
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
  chk: "chika",
  cca: "cocoa",
  chn: "chino",
  mhk: "miho",
  kan: "kana",
  kor: "fran",
  mana: "mana",
  saegusa: "saegusa",
  asakura: "asakura",
  koh: "kohei",
  stm: "satomi",
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
  const nextAttrRegex =
    /\s+(name|voice|clip|hide|actorId|window|thumbnial|thumbnail)=/i;
  const nextMatch = rest.match(nextAttrRegex);
  let content = "";
  if (nextMatch) content = rest.substring(0, nextMatch.index);
  else content = rest.replace(/\s*\]\s*$/, "");
  return content.trim();
};

// --- PARSER (Simplified for Bond Story) ---
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
      foundTitle = getAttr(trimmed, "title");
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
      trimmed.startsWith("[backgroundtween")
    ) {
      flushBuffer();
      const bgId = getAttr(trimmed, "id");
      const startTime = getStartTime(trimmed);
      if (bgId && backgroundMap[bgId]) {
        scriptData.push({
          type: "background",
          src: `${R2_BG_URL}/${backgroundMap[bgId]}.webp`,
          bgName: bgId,
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
            currentDialog.sfxList.push({ src: seSrc, delay: delayMs });
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
                lastItem.sfxList.push({ src: seSrc, delay: delayMs });
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

      // LOGIKA MERGING
      if (
        currentDialog &&
        currentDialog.speakerCode === speakerCode &&
        !currentDialog.voiceUrl &&
        !isNarration
      ) {
        currentDialog.text += "\n" + (inlineText || "");
        if (pendingSfx.length > 0) {
          pendingSfx.forEach((sfx) => {
            let delayMs = 0;
            if (currentDialog.startTime !== null && sfx.startTime !== null) {
              delayMs = Math.max(
                0,
                (sfx.startTime - currentDialog.startTime) * 1000,
              );
            }
            currentDialog.sfxList.push({ src: sfx.src, delay: delayMs });
          });
          pendingSfx = [];
        }
        continue;
      }

      if (currentDialog) {
        scriptData.push(currentDialog);
        currentDialog = null;
      }

      if (!displayName && speakerCode && CHARACTER_NAMES[speakerCode])
        displayName = CHARACTER_NAMES[speakerCode];
      if (speakerCode && ICON_MAP[speakerCode])
        iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[speakerCode]}.png`;
      else if (speakerCode && speakerCode !== "unknown" && !isNarration)
        iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${speakerCode}.png`;

      const startTime = getStartTime(trimmed);
      const newDialog = {
        type: "dialogue",
        speakerCode,
        speakerName: displayName,
        speakerNameEn:
          speakerCode && CHARACTER_NAMES[speakerCode]
            ? CHARACTER_NAMES[speakerCode]
            : "",
        iconUrl,
        voiceUrl: null,
        text: inlineText || "",
        translations: { en: "", id: "" },
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
            newDialog.sfxList.push({ src: sfx.src, delay: delayMs });
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
      const targetActorId = actorId ? actorId.toLowerCase() : null;
      const voiceUrl = voiceFile
        ? `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.m4a`
        : null;

      let target = currentDialog;
      if (!target && scriptData.length > 0) {
        for (let j = scriptData.length - 1; j >= 0; j--) {
          if (scriptData[j].type === "dialogue") {
            if (!targetActorId || scriptData[j].speakerCode === targetActorId) {
              target = scriptData[j];
              break;
            }
          }
        }
      }

      if (target) {
        if (voiceUrl) target.voiceUrl = voiceUrl;
        if (actorId) {
          const code = actorId.toLowerCase();
          if (!target.speakerCode || target.speakerCode === "unknown") {
            target.speakerCode = code;
            if (!target.iconUrl && ICON_MAP[code])
              target.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
          }
        }
      }
      continue;
    }

    if (trimmed.startsWith("[jump")) {
      flushBuffer();
      scriptData.push({ type: "jump", nextLabel: getAttr(trimmed, "next") });
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

  const INDEX_PATH = path.join(OUTPUT_DIR, "index_bond.json");
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

  let FILE_LIST = [];
  try {
    const listContent = fs.readFileSync(FOLDER_LIST_PATH, "utf-8");
    FILE_LIST = listContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
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
    const jsonFileName = `${assetId}.json`;

    const parts = assetId.split("_");
    if (parts.length < 5) {
      console.warn(`[SKIP] Invalid format: ${fileName}`);
      continue;
    }

    const charCode = parts[2];
    const episodeNum = parseInt(parts[4]);

    if (
      cacheMap[assetId] &&
      fs.existsSync(path.join(OUTPUT_DIR, jsonFileName))
    ) {
      if (!groupedCharacters[charCode]) {
        groupedCharacters[charCode] = {
          id: charCode,
          name: CHARACTER_NAMES[charCode] || charCode.toUpperCase(),
          stories: [],
        };
      }
      groupedCharacters[charCode].stories.push(cacheMap[assetId]);
      cachedFilesCount++;
      continue;
    }

    try {
      const jpResponse = await fetch(`${R2_TEXT_URL}/${fileName}`);
      if (!jpResponse.ok) throw new Error(`HTTP Error ${jpResponse.status}`);
      const jpRawContent = await jpResponse.text();

      const { scriptData: jpScriptData, title: jpTitle } = parseLines(
        jpRawContent.replace(/\r\n/g, "\n").split("\n"),
        assetId,
      );

      // TRANSLATION ZIPPING LOGIC
      let enScriptData = [];
      try {
        const enResponse = await fetch(`${R2_TEXT_EN_URL}/${fileName}`);
        if (enResponse.ok) {
          const enRawContent = await enResponse.text();
          const parsedEn = parseLines(
            enRawContent.replace(/\r\n/g, "\n").split("\n"),
            assetId,
          );
          enScriptData = parsedEn.scriptData;
        }
      } catch (e) {
        console.warn(`\n[WARN] Failed to fetch English TXT for ${fileName}`);
      }

      if (enScriptData.length > 0) {
        const jpDialogues = jpScriptData.filter(
          (item) => item.type === "dialogue",
        );
        const enDialogues = enScriptData.filter(
          (item) => item.type === "dialogue",
        );

        for (let idx = 0; idx < jpDialogues.length; idx++) {
          if (enDialogues[idx]) {
            jpDialogues[idx].translations.en = enDialogues[idx].text;
            if (enDialogues[idx].speakerName) {
              jpDialogues[idx].speakerNameEn = enDialogues[idx].speakerName;
            }
          }
        }
      }

      const displayTitle = jpTitle || `Episode ${episodeNum}`;
      fs.writeFileSync(
        path.join(OUTPUT_DIR, jsonFileName),
        JSON.stringify(
          {
            id: assetId,
            title: displayTitle + episodeNum,
            script: jpScriptData,
          },
          null,
          2,
        ),
      );

      totalFilesProcessed++;

      if (!groupedCharacters[charCode]) {
        const charName = CHARACTER_NAMES[charCode] || charCode.toUpperCase();
        groupedCharacters[charCode] = {
          id: charCode,
          name: charName,
          stories: [],
        };
      }

      groupedCharacters[charCode].stories.push({
        id: assetId,
        title: displayTitle + episodeNum,
        epNum: episodeNum,
        fileName: jsonFileName,
      });
    } catch (err) {
      console.error(`[ERROR] Failed processing ${fileName}:`, err.message);
    }
  }

  const indexData = Object.values(groupedCharacters)
    .map((charGroup) => {
      charGroup.stories.sort((a, b) => a.epNum - b.epNum);
      return charGroup;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "index_bond.json"),
    JSON.stringify(indexData, null, 2),
  );

  console.log(`\nSync Completed! Processed ${totalFilesProcessed} files.`);
})();
