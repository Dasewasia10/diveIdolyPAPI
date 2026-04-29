import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://apiip.dasewasia.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/loveStoryTxt`;
const R2_TEXT_EN_URL = `${R2_DOMAIN}/loveStoryTxtGlobal`;
const R2_VOICE_URL = `${R2_DOMAIN}/loveStoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;

const OUTPUT_DIR = path.join(__dirname, "../data/lovestory");

// --- DAFTAR FILE (Sesuai list Anda) ---
const FILE_LIST = [
  "adv_love_2305_01_01.txt",
  "adv_love_2305_02_01.txt",
  "adv_love_2305_03_01.txt",
  "adv_love_2305_04_01.txt",
  "adv_love_2305_05_01.txt",
  "adv_love_2305_06_01.txt",
  "adv_love_2305_07_01.txt",
  "adv_love_2305_08_01.txt",
  "adv_love_2305_08_02.txt",
  "adv_love_2305_08_03.txt",
  "adv_love_2311_01_01.txt",
  "adv_love_2311_02_01.txt",
  "adv_love_2311_03_01.txt",
  "adv_love_2311_04_01.txt",
  "adv_love_2311_05_01.txt",
  "adv_love_2311_06_01.txt",
  "adv_love_2311_07_01.txt",
  "adv_love_2311_08_01.txt",
  "adv_love_2311_08_02.txt",
  "adv_love_2311_08_03.txt",
  "adv_love_2405_01_01.txt",
  "adv_love_2405_02_01.txt",
  "adv_love_2405_03_01.txt",
  "adv_love_2405_04_01.txt",
  "adv_love_2405_05_01.txt",
  "adv_love_2405_06_01.txt",
  "adv_love_2405_07_01.txt",
  "adv_love_2405_08_01.txt",
  "adv_love_2405_08_02.txt",
  "adv_love_2405_08_03.txt",
  "adv_love_2411_01_01.txt",
  "adv_love_2411_02_01.txt",
  "adv_love_2411_03_01.txt",
  "adv_love_2411_04_01.txt",
  "adv_love_2411_05_01.txt",
  "adv_love_2411_06_01.txt",
  "adv_love_2411_07_01.txt",
  "adv_love_2411_08_01.txt",
  "adv_love_2411_08_02.txt",
  "adv_love_2411_08_03.txt",
  "adv_love_2505_01_01.txt",
  "adv_love_2505_02_01.txt",
  "adv_love_2505_03_01.txt",
  "adv_love_2505_03_02.txt",
  "adv_love_2505_04_01.txt",
  "adv_love_2505_04_02.txt",
  "adv_love_2505_04_03.txt",
  "adv_love_2505_04_04.txt",
  "adv_love_2505_05_01.txt",
  "adv_love_2505_05_02.txt",
  "adv_love_2505_05_03.txt",
  "adv_love_2505_05_04.txt",
  "adv_love_2505_05_05.txt",
  "adv_love_2505_05_06.txt",
  "adv_love_2505_05_07.txt",
  "adv_love_2505_05_08.txt",
  "adv_love_2505_05_09.txt",
  "adv_love_2505_05_10.txt",
  "adv_love_2603_01_01.txt",
  "adv_love_2603_02_01.txt",
  "adv_love_2603_03_01.txt",
  "adv_love_2603_04_01.txt",
  "adv_love_2603_05_01.txt",
  "adv_love_2603_06_01.txt",
  "adv_love_2603_07_01.txt",
  "adv_love_2603_08_01.txt",
  "adv_love_2603_08_02.txt",
  "adv_love_2603_08_03.txt",
];

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
  chk: "Chika",
  cca: "Cocoa",
  chn: "Chino",
  mhk: "Miho",
  kan: "Kana",
  kor: "Fran",
  mana: "Mana Nagase",
  tencho: "Manager",
  saegusa: "Saegusa",
  asakura: "Asakura",
  koh: "Kohei",
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

const detectMainHeroine = (script) => {
  const counts = {};
  const excluded = ["koh", "mob", "narration", "unknown", "tencho", "staff"];

  // Deteksi Heroine dari semua layer
  const countHeroines = (arr) => {
    arr.forEach((line) => {
      if (line.type === "dialogue" && line.speakerCode) {
        const code = line.speakerCode.toLowerCase();
        if (!excluded.includes(code)) counts[code] = (counts[code] || 0) + 1;
      } else if (line.type === "choice_selection" && line.choices) {
        line.choices.forEach((c) => {
          if (c.route) countHeroines(c.route);
        });
      }
    });
  };

  countHeroines(script);

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
  let pendingSfx = [];

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
      if (bgmId)
        scriptData.push({
          type: "bgm",
          action: "play",
          src: `${R2_BGM_URL}/${bgmId}.m4a`,
          startTime: startTime,
        });
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
            if (
              lastItem.type === "choice_selection" ||
              lastItem.type === "jump" ||
              (lastItem.type === "bgm" && lastItem.action === "stop")
            )
              break;
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
        const match = thumbRaw.match(/img_(?:chr|mob)_adv_([a-z0-9]+)/i);
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
        speakerNameEn:
          speakerCode && SPEAKER_MAP[speakerCode]
            ? SPEAKER_MAP[speakerCode]
            : "",
        iconUrl,
        voiceUrl: null,
        text: inlineText || "",
        translations: { en: "", id: "" },
        startTime: startTime,
        sfxList: [],
      };

      if (pendingSfx.length > 0 && startTime !== null) {
        pendingSfx.forEach((sfx) => {
          if (sfx.startTime !== null && sfx.startTime >= startTime - 0.5) {
            const delayMs = Math.max(0, (sfx.startTime - startTime) * 1000);
            newDialog.sfxList.push({ src: sfx.src, delay: delayMs });
          } else scriptData.push(sfx);
        });
        pendingSfx = [];
      } else if (pendingSfx.length > 0) {
        pendingSfx.forEach((sfx) => scriptData.push(sfx));
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
          if (
            scriptData[j].type === "choice_selection" ||
            scriptData[j].type === "jump"
          )
            break;
        }
      }

      if (target) {
        if (voiceUrl) target.voiceUrl = voiceUrl;
        if (actorId) {
          const code = actorId.toLowerCase();
          if (target.speakerCode === "unknown" || !target.speakerCode) {
            target.speakerCode = code;
            if (!target.iconUrl && ICON_MAP[code])
              target.iconUrl = `${R2_DOMAIN}/iconCharacter/chara-${ICON_MAP[code]}.png`;
            if (!target.speakerName && SPEAKER_MAP[code])
              target.speakerName = SPEAKER_MAP[code];
          }
        }
      }
      continue;
    }

    if (trimmed.startsWith("[choicegroup")) {
      flushBuffer();
      const choices = [];
      const choiceRegex = /text=([^\]]+)/g;
      let match;
      while ((match = choiceRegex.exec(trimmed)) !== null)
        choices.push({ text: match[1].trim(), route: [] });

      if (
        i + 1 < lines.length &&
        lines[i + 1].trim().startsWith("[branchgroup")
      ) {
        i++;
        for (let c = 0; c < choices.length; c++) {
          while (
            i + 1 < lines.length &&
            !lines[i + 1].trim().startsWith("[branch")
          )
            i++;
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
      if (choices.length > 0)
        scriptData.push({ type: "choice_selection", choices: choices });
      continue;
    }

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

  return scriptData;
};

const parseScript = (rawText, assetId) => {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  return parseLines(lines, assetId);
};

// FUNGSI REKURSIF UNTUK MENDAPATKAN SEMUA DIALOGUE DARI BERBAGAI LAYER
const extractAllDialogues = (scriptArray) => {
  let dialogues = [];
  scriptArray.forEach((item) => {
    if (item.type === "dialogue") {
      dialogues.push(item);
    } else if (item.type === "choice_selection" && item.choices) {
      item.choices.forEach((choice) => {
        if (choice.route && choice.route.length > 0) {
          dialogues.push(...extractAllDialogues(choice.route));
        }
      });
    }
  });
  return dialogues;
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
      const jpResponse = await fetch(`${R2_TEXT_URL}/${fileName}`);
      if (!jpResponse.ok) throw new Error(`HTTP Error ${jpResponse.status}`);
      const jpRawContent = await jpResponse.text();
      const jpScriptData = parseScript(jpRawContent, assetId);

      // TRANSLATION ZIPPING LOGIC DENGAN RECURSIVE
      let enScriptData = [];
      try {
        const enResponse = await fetch(`${R2_TEXT_EN_URL}/${fileName}`);
        if (enResponse.ok) {
          const enRawContent = await enResponse.text();
          enScriptData = parseScript(enRawContent, assetId);
        }
      } catch (e) {
        console.warn(`\n[WARN] Failed to fetch English TXT for ${fileName}`);
      }

      if (enScriptData.length > 0) {
        // Gunakan ekstrak rekursif agar percabangan (choices) ikut ditangkap!
        const jpDialogues = extractAllDialogues(jpScriptData);
        const enDialogues = extractAllDialogues(enScriptData);

        for (let idx = 0; idx < jpDialogues.length; idx++) {
          if (enDialogues[idx]) {
            // Karena ini by reference, merubah jpDialogues akan merubah juga yang ada di dalam tree jpScriptData asli!
            jpDialogues[idx].translations.en = enDialogues[idx].text;
            if (enDialogues[idx].speakerName) {
              jpDialogues[idx].speakerNameEn = enDialogues[idx].speakerName;
            }
          }
        }
      }

      const jsonFileName = `${assetId}.json`;
      fs.writeFileSync(
        path.join(OUTPUT_DIR, jsonFileName),
        JSON.stringify(
          {
            id: assetId,
            title: `Episode ${parseInt(episode)} Part ${parseInt(part)}`,
            script: jpScriptData,
          },
          null,
          2,
        ),
      );

      totalFilesProcessed++;

      if (!groupedEvents[eventId]) {
        const mainHeroineCode = detectMainHeroine(jpScriptData);
        const heroineName =
          mainHeroineCode && SPEAKER_MAP[mainHeroineCode]
            ? SPEAKER_MAP[mainHeroineCode]
            : "Unknown Story";

        let eventTitle = "";
        if (eventId === "2505")
          eventTitle = "Mintsuku 2025 (Magical Girl & Succubus)";
        else
          eventTitle = `Moshikoi 20${eventId.substring(0, 2)} (${heroineName})`;

        groupedEvents[eventId] = {
          id: eventId,
          title: eventTitle,
          episodes: [],
        };
      }

      groupedEvents[eventId].episodes.push({
        id: assetId,
        title: `Ep ${parseInt(episode)} - ${parseInt(part)}`,
        fileName: jsonFileName,
      });
    } catch (err) {
      console.error(`[ERROR] Failed processing ${fileName}:`, err.message);
    }
  }

  const indexData = Object.values(groupedEvents).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "index.json"),
    JSON.stringify(indexData, null, 2),
  );

  console.log(`\nSync Completed! Processed ${totalFilesProcessed} files.`);
})();
