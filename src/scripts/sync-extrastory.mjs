import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://apiip.dasewasia.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/extraStoryTxt`;
const R2_TEXT_EN_URL = `${R2_DOMAIN}/extraStoryTxtGlobal`;
const R2_VOICE_URL = `${R2_DOMAIN}/extraStoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;

const OUTPUT_DIR = path.join(__dirname, "../data/extrastory");
const FOLDER_LIST_PATH = path.join(__dirname, "../data/extra_folderList.txt");

// --- MAPPING KARAKTER (Bisa dilengkapi) ---
const GROUP_NAMES = {
  mna: "Mana Nagase",
  liz: "Liznoir",
  tri: "TRINITAiLE",
  moon: "Moon Tempest",
  sun: "Sunny Peace",
  thrx: "IIIX",
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
  shj: "saegusa",
  kyi: "asakura",
  koh: "kohei",
  stm: "satomi",
  krk: "kiriko",
};

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
  shj: "Shinji Saegusa",
  kyi: "Asakura",
  koh: "Kohei Makino",
  stm: "Satomi Hashimoto",
  krk: "Kiriko Himeno",
};

// --- HELPERS ---
const getStartTime = (line) => {
  const match = line.match(/_startTime\\?":\s*([0-9.]+)/);
  return match ? parseFloat(match[1]) : null;
};

// TAMBAHAN: Helper Durasi
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
  if (cleanSrc.includes("env_adv_3d_"))
    cleanSrc = cleanSrc.replace("env_adv_3d_", "env_adv_2d_");
  cleanSrc = cleanSrc.replace(/-000(-|$)/, "$1");
  return `${R2_BG_URL}/${cleanSrc}.webp`;
};

// --- PARSER ---
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
        // Regex diperluas untuk mendeteksi karakter "chr" (utama) maupun "mob" (NPC)
        // dan cukup mengambil kode alfabet pertama setelah "adv_"
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

      // TAMBAHAN: Simpan durasi dan endTime
      const startTime = getStartTime(trimmed);
      const duration = getDuration(trimmed) || 0;
      const endTime = startTime !== null ? startTime + duration : null;

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
        endTime: endTime,
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
      const targetActorId = actorId ? actorId.toLowerCase() : null;
      const voiceUrl = voiceFile
        ? `${R2_VOICE_URL}/sud_vo_${assetId}/${voiceFile}.m4a`
        : null;

      const vStart = getStartTime(trimmed);
      const vDur = getDuration(trimmed);
      const vEnd = vStart !== null && vDur !== null ? vStart + vDur : null;

      // LOGIKA SMART BOUNDING BOX MERGING
      if (voiceUrl && vStart !== null && vEnd !== null) {
        let matchingDialogs = [];

        for (let j = 0; j < scriptData.length; j++) {
          const item = scriptData[j];
          if (item && item.type === "dialogue" && item.startTime !== null) {
            if (
              item.startTime >= vStart - 0.5 &&
              item.startTime <= vEnd + 0.5
            ) {
              if (!targetActorId || item.speakerCode === targetActorId) {
                matchingDialogs.push({
                  source: "scriptData",
                  index: j,
                  item: item,
                });
              }
            }
          }
        }

        if (currentDialog && currentDialog.startTime !== null) {
          if (
            currentDialog.startTime >= vStart - 0.5 &&
            currentDialog.startTime <= vEnd + 0.5
          ) {
            if (!targetActorId || currentDialog.speakerCode === targetActorId) {
              matchingDialogs.push({
                source: "currentDialog",
                index: -1,
                item: currentDialog,
              });
            }
          }
        }

        if (matchingDialogs.length > 0) {
          const primaryMatch = matchingDialogs[0]; // Selalu gunakan Index 0 untuk start time absolut
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
          let minStart = vStart;
          let maxEnd = vEnd;

          for (let k = 0; k < matchingDialogs.length; k++) {
            const matchObj = matchingDialogs[k];
            const item = matchObj.item;

            if (item.startTime !== null && item.startTime < minStart)
              minStart = item.startTime;
            if (item.endTime !== null && item.endTime > maxEnd)
              maxEnd = item.endTime;

            mergedText += (mergedText ? "\n" : "") + (item.text || "");

            if (item.sfxList && item.sfxList.length > 0) {
              item.sfxList.forEach((sfx) => {
                let newDelay =
                  sfx.startTime !== undefined && minStart !== null
                    ? Math.max(0, (sfx.startTime - minStart) * 1000)
                    : sfx.delay;
                mergedSfx.push({
                  ...sfx,
                  delay: newDelay,
                  startTime: sfx.startTime,
                });
              });
            }

            if (k !== 0) {
              if (matchObj.source === "scriptData")
                scriptData[matchObj.index] = null;
              else if (matchObj.source === "currentDialog")
                currentDialog = null;
            }
          }

          primary.text = mergedText;
          primary.sfxList = mergedSfx;
          primary.startTime = minStart;
          primary.endTime = maxEnd;

          for (let i = scriptData.length - 1; i >= 0; i--) {
            if (scriptData[i] === null) scriptData.splice(i, 1);
          }
        } else {
          // Fallback Target dengan Actor ID Filter
          let target = currentDialog;
          if (
            !target ||
            (targetActorId && target.speakerCode !== targetActorId)
          ) {
            target = null;
            if (scriptData.length > 0) {
              for (let j = scriptData.length - 1; j >= 0; j--) {
                if (scriptData[j] && scriptData[j].type === "dialogue") {
                  if (
                    !targetActorId ||
                    scriptData[j].speakerCode === targetActorId
                  ) {
                    target = scriptData[j];
                    break;
                  }
                }
              }
            }
          }
          if (target) target.voiceUrl = voiceUrl;
        }
      } else {
        // Fallback klasik tanpa info durasi
        let target = currentDialog;
        if (
          !target ||
          (targetActorId && target.speakerCode !== targetActorId)
        ) {
          target = null;
          if (scriptData.length > 0) {
            for (let j = scriptData.length - 1; j >= 0; j--) {
              if (scriptData[j] && scriptData[j].type === "dialogue") {
                if (
                  !targetActorId ||
                  scriptData[j].speakerCode === targetActorId
                ) {
                  target = scriptData[j];
                  break;
                }
              }
            }
          }
        }
        if (target) target.voiceUrl = voiceUrl;
      }
      continue;
    }

    if (trimmed.startsWith("[choicegroup")) {
      flushBuffer();
      const choices = [];
      const choiceRegex = /text=([^\]]+)/g;
      let match;
      while ((match = choiceRegex.exec(trimmed)) !== null) {
        choices.push({ text: match[1].trim(), route: [] });
      }

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
              choices[c].route = branchScript.scriptData;
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

// HELPER ZIPPING: Ekstrak Dialog secara Rekursif dari Seluruh Layer Termasuk Percabangan
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

// --- MAIN EXECUTION ---
(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  const groupedGroups = {};
  let totalFilesProcessed = 0;

  console.log(`Starting Extra Story sync...`);

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
      // 1. Fetch File Jepang
      const jpResponse = await fetch(`${R2_TEXT_URL}/${fileName}`);
      if (!jpResponse.ok) throw new Error(`HTTP Error ${jpResponse.status}`);
      const jpRawContent = await jpResponse.text();

      const { scriptData: jpScriptData, title: jpTitle } = parseLines(
        jpRawContent.replace(/\r\n/g, "\n").split("\n"),
        assetId,
      );

      // 2. Fetch File Inggris (TRANSLATION ZIPPING LOGIC DENGAN RECURSIVE)
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
        const jpDialogues = extractAllDialogues(jpScriptData);
        const enDialogues = extractAllDialogues(enScriptData);

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
      const jsonFileName = `${assetId}.json`;
      fs.writeFileSync(
        path.join(OUTPUT_DIR, jsonFileName),
        JSON.stringify(
          {
            id: assetId,
            title: displayTitle + " " + setNum + " " + episodeNum,
            script: jpScriptData,
          },
          null,
          2,
        ),
      );

      totalFilesProcessed++;

      if (!groupedGroups[groupCode]) {
        const groupName = GROUP_NAMES[groupCode] || groupCode.toUpperCase();
        groupedGroups[groupCode] = {
          id: groupCode,
          name: groupName,
          stories: [],
        };
      }

      const epNumIndex = parseInt(setNum) * 10 + parseInt(episodeNum);
      groupedGroups[groupCode].stories.push({
        id: assetId,
        title: displayTitle + " " + setNum + " " + episodeNum,
        epNum: epNumIndex,
        fileName: jsonFileName,
      });
    } catch (err) {
      console.error(`[ERROR] Failed processing ${fileName}:`, err.message);
    }
  }

  const indexData = Object.values(groupedGroups)
    .map((groupGroup) => {
      groupGroup.stories.sort((a, b) => a.epNum - b.epNum);
      return groupGroup;
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "index_extra.json"),
    JSON.stringify(indexData, null, 2),
  );

  console.log(`\nSync Completed! Processed ${totalFilesProcessed} files.`);
})();
