import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const R2_DOMAIN = "https://apiip.dasewasia.my.id";
const R2_TEXT_URL = `${R2_DOMAIN}/eventStoryTxt`;
const R2_TEXT_EN_URL = `${R2_DOMAIN}/eventStoryTxtGlobal`;
const R2_VOICE_URL = `${R2_DOMAIN}/eventStoryVoice`;
const R2_BG_URL = `${R2_DOMAIN}/storyBackground`;
const R2_BGM_URL = `${R2_DOMAIN}/storyBgm`;

const OUTPUT_DIR = path.join(__dirname, "../data/eventstory");
const DETAIL_DIR = path.join(OUTPUT_DIR, "detail");
const FOLDER_LIST_PATH = path.join(__dirname, "../data/event_folderList.txt");

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
  chk: "Chika",
  cca: "Cocoa",
  chn: "Chino",
  mhk: "Miho",
  kan: "Kana",
  kor: "Fran",
  mana: "Mana Nagase",
  tencho: "Manager",
  shj: "Saegusa",
  kyi: "Asakura",
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
  chk: "chika",
  cca: "cocoa",
  chn: "chino",
  mhk: "miho",
  kan: "kana",
  kor: "fran",
  mana: "mana",
  shj: "saegusa",
  kyi: "asakura",
  stm: "satomi",
  koh: "makino",
  system: null,
};

// --- HELPERS ---
const getStartTime = (line) => {
  const match = line.match(/_startTime\\?":\s*([0-9.]+)/);
  return match ? parseFloat(match[1]) : null;
};

// HELPER TAMBAHAN: Untuk mendapatkan Durasi
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

const detectMainHeroine = (script) => {
  const counts = {};
  const excluded = ["koh", "mob", "narration", "unknown", "tencho", "staff"];

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

// --- PARSER ENGINE ---
const parseLines = (lines, assetId) => {
  const scriptData = [];
  const backgroundMap = {};
  let currentDialog = null;
  let pendingSfx = [];
  let scriptTitle = null;

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

    if (trimmed.startsWith("[title ")) {
      const titleMatch = trimmed.match(/title=([^\]]+)/i);
      if (titleMatch) scriptTitle = titleMatch[1].trim();
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

      // TAMBAHAN: Kalkulasi endTime
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

      if (pendingSfx.length > 0 && startTime !== null) {
        pendingSfx.forEach((sfx) => {
          if (sfx.startTime !== null && sfx.startTime >= startTime - 0.5) {
            const delayMs = Math.max(0, (sfx.startTime - startTime) * 1000);
            newDialog.sfxList.push({ src: sfx.src, delay: delayMs });
          } else {
            scriptData.push(sfx);
          }
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

      const vStart = getStartTime(trimmed);
      const vDur = getDuration(trimmed);
      const vEnd = vStart !== null && vDur !== null ? vStart + vDur : null;

      // LOGIKA BOUNDING BOX MERGING
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
          const primaryMatch = matchingDialogs[0]; // Selalu gunakan Index 0 untuk start time sejati
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
          // Fallback Target
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
        // Fallback klasik tanpa durasi
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

    if (trimmed.startsWith("[branch")) {
      flushBuffer();
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

  return { scriptData, scriptTitle };
};

const parseScript = (rawText, assetId) => {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  return parseLines(lines, assetId);
};

// HELPER ZIPPING: Mengekstrak Dialog dari Seluruh Layer Termasuk Percabangan
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
  if (!fs.existsSync(DETAIL_DIR)) fs.mkdirSync(DETAIL_DIR, { recursive: true });

  if (!fs.existsSync(FOLDER_LIST_PATH)) {
    console.error(`[ERROR] List file not found at ${FOLDER_LIST_PATH}`);
    return;
  }

  const fileList = fs
    .readFileSync(FOLDER_LIST_PATH, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.endsWith(".txt"));

  const groupedEvents = {};
  let totalFilesProcessed = 0;
  let cachedFilesCount = 0;

  // --- BACA CACHE LAMA ---
  const INDEX_PATH = path.join(OUTPUT_DIR, "index.json");
  const cacheMap = {};
  if (fs.existsSync(INDEX_PATH)) {
    const oldIndex = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
    oldIndex.forEach((group) => {
      group.episodes.forEach((ep) => {
        cacheMap[ep.id] = ep;
      });
    });
    console.log(
      `[CACHE] Ditemukan ${Object.keys(cacheMap).length} cerita di index lama.`,
    );
  }

  // --- FETCH MASTER DATA GITHUB ---
  const BASE_URL =
    "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
  let assetToEpisodeTitle = {};
  let eventIdToTitle = {};

  console.log(
    `Mengambil Story.json dan EventStory.json dari Master Diff Github...`,
  );
  try {
    const [storyRes, eventRes] = await Promise.all([
      fetch(`${BASE_URL}/Story.json`),
      fetch(`${BASE_URL}/EventStory.json`),
    ]);

    if (storyRes.ok) {
      const storyData = await storyRes.json();
      storyData.forEach((story) => {
        if (story.advAssetIds) {
          story.advAssetIds.forEach((asset) => {
            assetToEpisodeTitle[asset] = story.title || story.name;
          });
        }
      });
    }

    if (eventRes.ok) {
      const eventData = await eventRes.json();
      eventData.forEach((ev) => {
        // PENYELESAIAN MASALAH TITLE: Ambil 'description' alih-alih 'name'
        let trueTitle = ev.description;
        if (!trueTitle || trueTitle === "") {
          trueTitle = ev.name; // Fallback jika description benar-benar kosong
        }

        // Pengecekan via Episodes untuk mapping presisi!
        if (ev.episodes && ev.episodes.length > 0) {
          ev.episodes.forEach((ep) => {
            // ep.assetId berbentuk "event_2107_01_01" (Tanpa awalan adv_)
            const match = ep.assetId.match(/^event_([^_]+)_/);
            if (match) {
              const evId = match[1]; // misal "2107"
              eventIdToTitle[evId] = trueTitle;
            }
          });
        }
      });
    }
    console.log(`[OK] Berhasil memetakan judul asli dari EventStory.json.`);
  } catch (err) {
    console.warn(
      `[WARN] Gagal memuat Master Diff, akan menggunakan judul cadangan.`,
      err.message,
    );
  }

  console.log(`Starting sync for ${fileList.length} files...`);

  for (let i = 0; i < fileList.length; i++) {
    const fileName = fileList[i];
    const assetId = fileName.replace(".txt", "");

    const match = assetId.match(/^adv_event_(.+)_([^_]+)_([^_]+)$/);
    if (!match) {
      console.warn(`[WARN] Format file tidak dikenali, di-skip: ${fileName}`);
      continue;
    }

    const eventId = match[1];
    const episode = match[2];
    const part = match[3];
    const jsonFileName = `${assetId}.json`;

    if (!groupedEvents[eventId]) {
      let eventTitleFinal =
        eventIdToTitle[eventId] || `Event Story: ${eventId.toUpperCase()}`;
      groupedEvents[eventId] = {
        id: eventId,
        title: eventTitleFinal,
        episodes: [],
      };
    }

    if (
      cacheMap[assetId] &&
      fs.existsSync(path.join(DETAIL_DIR, jsonFileName))
    ) {
      groupedEvents[eventId].episodes.push(cacheMap[assetId]);
      cachedFilesCount++;
      continue;
    }

    try {
      const jpResponse = await fetch(`${R2_TEXT_URL}/${fileName}`);
      if (!jpResponse.ok) throw new Error(`HTTP Error ${jpResponse.status}`);
      const jpRawContent = await jpResponse.text();

      const { scriptData: jpScriptData, scriptTitle } = parseScript(
        jpRawContent,
        assetId,
      );

      // TRANSLATION ZIPPING LOGIC (Recursive)
      let enScriptData = [];
      try {
        const enResponse = await fetch(`${R2_TEXT_EN_URL}/${fileName}`);
        if (enResponse.ok) {
          const enRawContent = await enResponse.text();
          const parsedEn = parseScript(enRawContent, assetId);
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

      // LOGIKA PENENTUAN JUDUL EPISODE
      const epFormatted = isNaN(parseInt(episode))
        ? episode
        : parseInt(episode);
      const partFormatted = isNaN(parseInt(part))
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : parseInt(part);

      // Cocokkan tanpa awalan "adv_" seperti pada Story.json
      const baseAssetId = assetId.replace(/^adv_/, "");
      const episodeTitleFinal =
        assetToEpisodeTitle[baseAssetId] ||
        scriptTitle ||
        `Episode ${epFormatted} Part ${partFormatted}`;

      fs.writeFileSync(
        path.join(DETAIL_DIR, jsonFileName),
        JSON.stringify(
          { id: assetId, title: episodeTitleFinal, script: jpScriptData },
          null,
          2,
        ),
      );

      totalFilesProcessed++;

      // LOGIKA PENENTUAN JUDUL GROUP/EVENT
      if (!groupedEvents[eventId]) {
        let eventTitleFinal = eventIdToTitle[eventId];

        if (!eventTitleFinal) {
          const mainHeroineCode = detectMainHeroine(jpScriptData);
          const heroineName =
            mainHeroineCode && SPEAKER_MAP[mainHeroineCode]
              ? SPEAKER_MAP[mainHeroineCode]
              : "Event";

          if (isNaN(parseInt(eventId))) {
            eventTitleFinal = `Event Story: ${eventId.toUpperCase()}`;
          } else {
            eventTitleFinal = `Idoly Event 20${eventId.substring(0, 2)} (${heroineName})`;
          }
        }

        groupedEvents[eventId] = {
          id: eventId,
          title: eventTitleFinal,
          episodes: [],
        };
      }

      groupedEvents[eventId].episodes.push({
        id: assetId,
        title: episodeTitleFinal,
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
