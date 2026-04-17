import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

// --- KONFIGURASI UMUM ---
const R2_DOMAIN = "https://apiip.dasewasia.my.id";
const BASE_URL =
  "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error(
    "❌ ERROR: API Key tidak ditemukan! Berjalan menggunakan mode REGEX (Tanpa AI).",
  );
} else {
  console.log("✅ API Key ditemukan. Mode AI Aktif.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, "../data/card/cardSources.json");

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  generationConfig: { responseMimeType: "application/json" },
});

// --- MAPPING DASAR ---
const charIdToName = {
  "char-mna": "Mana",
  "char-ktn": "Kotono",
  "char-skr": "Sakura",
  "char-rei": "Rei",
  "char-ngs": "Nagisa",
  "char-hrk": "Haruko",
  "char-ski": "Saki",
  "char-suz": "Suzu",
  "char-mei": "Mei",
  "char-szk": "Shizuku",
  "char-rui": "Rui",
  "char-yu": "Yuu",
  "char-smr": "Sumire",
  "char-rio": "Rio",
  "char-aoi": "Aoi",
  "char-ai": "Ai",
  "char-kkr": "Kokoro",
  "char-chs": "Chisa",
  "char-mhk": "Miho",
  "char-kan": "Kana",
  "char-kor": "Fran",
};

const mapType = (id) =>
  ["Unknown", "Scorer", "Buffer", "Supporter"][id] || "Unknown";

const mapAttribute = (card) => {
  const max = Math.max(
    card.vocalRatioPermil,
    card.danceRatioPermil,
    card.visualRatioPermil,
  );
  return max === card.vocalRatioPermil
    ? "Vocal"
    : max === card.danceRatioPermil
      ? "Dance"
      : "Visual";
};

const mapSkillType = (t) => ({ 1: "SP", 2: "A", 3: "P" })[t] || "A";

const ICON_MAP = {
  1: "score-up",
  2: "vocal-up",
  3: "dance-up",
  4: "visual-up",
  5: "stamina-recovery",
  6: "critical-rate-up",
  7: "critical-score-up",
  8: "draw-critical-rate-up",
  9: "beat-score-up",
  11: "vocal-down",
  12: "dance-down",
  13: "visual-down",
  15: "stamina-consumption-increase",
  19: "active-skill-score-up",
  20: "special-skill-score-up",
  21: "a-skill-level-up",
  27: "combo-score-up",
  28: "tension-up",
  29: "focus",
  30: "stealth",
  31: "mental-up",
  32: "stamina-consumption-reduction",
  33: "ct-reduction",
  34: "skill-success-rate-up",
  45: "audience-amount-increase",
  46: "audience-amount-reduction",
  53: "score-multiplier-add",
  60: "active-score-multiplier-add",
  64: "passive-skill-score-up",
  101: "remove-buffs",
  102: "remove-debuffs",
  103: "protection",
  107: "slump",
  108: "weakness-effect-reflection",
};

// --- MAPPING KOSTUM & KATEGORI ---
const COSTUME_CODE_MAP = {
  eve: "Event",
  idol: "Idol Outfit",
  mizg: "Swimsuit",
  casl: "Casual",
  fest: "Idol Fest",
  birt: "Birthday",
  schl: "School",
  prem: "Premium Gacha",
  xmas: "Christmas",
  miku: "Hatsune Miku",
  wedd: "Wedding",
  vlnt: "Valentine",
  yukt: "Yukata",
  newy: "New Year",
  goch: "Gochiusa",
  pair: "Pair",
  link: "Kizuna",
  flow: "Flower",
  anml: "Animal",
  frut: "Fruit",
  arab: "Bedlah",
  chna: "China",
  kait: "Kaito",
  rock: "Rock",
  circ: "Circuit",
  past: "Past",
  sush: "Love Live Sunshine",
  chia: "Cheerleader",
  chsk: "ChisaSaki",
  hruh: "Haruhi",
  maid: "Maid",
  pajm: "Pajama",
  seik: "Uniform",
  adlt: "Adult",
  mnab: "About Mana",
  sail: "Sailor",
  buny: "Bunny Suit",
  poli: "Police",
  kion: "K-On",
  trbl: "To Love Ru Darkness",
  nurs: "Nurse",
  add: "Add",
  kiok: "Memories of the Starry Sky",
  akma: "Akuma",
  onep: "Onepiece Dress",
  halw: "Halloween",
  date: "Date",
  sucu: "Succubus",
  kifj: "Lady",
  waso: "Wasshoi",
  magi: "Magical Girl",
  angl: "Angel",
  alic: "Alice",
  yuru: "Yuru",
  ster: "Sister",
};

const CATEGORY_EXCEPTIONS = {
  Permanent: [
    "yu-05-wedd-01",
    "rio-05-wedd-00",
    "mhk-05-wedd-00",
    "aoi-05-wedd-00",
    "aoi-05-vlnt-00",
    "yu-05-vlnt-00",
    "skr-05-anml-00",
    "rei-05-chia-00",
    "kan-05-chia-00",
    "suz-05-seik-00",
    "smr-05-seik-00",
    "kor-05-nurs-00",
    "ngs-05-mizg-01",
    "hrk-05-mizg-01",
    "rui-05-mizg-01",
    "suz-05-mizg-01",
    "yu-05-mizg-01",
    "mei-05-mizg-02",
    "ski-05-mizg-02",
    "smr-05-mizg-01",
  ],
  Limited: [
    "suz-05-anml-00",
    "mei-05-rock-00",
    "ngs-05-maid-01",
    "smr-05-pajm-00",
    "szk-05-pajm-00",
    "kan-05-poli-00",
    "kor-05-poli-00",
    "mna-05-idol-00",
    "hrk-05-idol-03",
    "skr-05-idol-03",
    "kan-05-idol-00",
    "kor-05-idol-00",
    "mhk-05-idol-00",
    "kan-05-idol-03",
    "mhk-05-idol-03",
    "rui-05-idol-04",
    "yu-05-idol-04",
  ],
};

const getCardCategory = (assetId, rarity) => {
  for (const [categoryName, idList] of Object.entries(CATEGORY_EXCEPTIONS)) {
    if (idList.includes(assetId)) return categoryName;
  }
  if (rarity < 5) return "General";
  if (assetId.includes("fes")) return "Idol Fest";
  if (assetId.includes("link")) return "Kizuna";
  if (assetId.includes("prem")) return "Premium";
  if (assetId.includes("birt")) return "Birthday";

  const limitedCodes = [
    "xmas",
    "newy",
    "vlnt",
    "wedd",
    "mizg",
    "pair",
    "arab",
    "kait",
    "past",
    "chia",
    "seik",
    "adlt",
    "mnab",
    "buny",
    "nurs",
    "kiok",
    "akma",
    "alic",
    "ster",
    "miku",
    "kion",
    "trbl",
    "hruh",
    "goch",
  ];
  if (limitedCodes.some((code) => assetId.includes(code))) return "Limited";

  return rarity === 5 ? "Permanent" : "General";
};

// --- TRANSLATION SETUP ---
const KEYWORDS = {
  自身: { en: "Self", id: "Diri Sendiri" },
  全員: { en: "All", id: "Semua" },
  ボーカル: { en: "Vocal", id: "Vokal" },
  ダンス: { en: "Dance", id: "Dance" },
  ビジュアル: { en: "Visual", id: "Visual" },
  スコア: { en: "Score", id: "Skor" },
  上昇: { en: "Up", id: "Naik" },
  低下: { en: "Down", id: "Turun" },
  回復: { en: "Recover", id: "Pulihkan" },
  消費: { en: "Consume", id: "Konsumsi" },
  ビート: { en: "Beats", id: "Beat" },
  コンボ: { en: "Combo", id: "Kombo" },
  クリティカル率: { en: "Crit Rate", id: "Rate Critical" },
  クリティカル係数: { en: "Crit Damage", id: "Damage Critical" },
  集目: { en: "Focus", id: "Fokus" },
  強化効果: { en: "Buffs", id: "Buff" },
  低下効果: { en: "Debuffs", id: "Debuff" },
  成功率: { en: "Success Rate", id: "Rate Sukses" },
  スキル成功率: { en: "Skill Success Rate", id: "Rate Sukses Skill" },
};

const PATTERNS = [
  {
    regex: /(\d+)%のスコア獲得/,
    en: "Gain $1% Score",
    id: "Perolehan Skor $1%",
  },
  {
    regex: /(.+)に(\d+)段階(.+)効果\[(\d+)ビート\]/,
    en: "Grants $2 lvls of $3 to $1 [$4 Beats]",
    id: "Memberi $1 $3 $2 tingkat [$4 Beat]",
  },
  {
    regex: /(.+)の(.+)(\d+)段階(上昇|低下)/,
    en: "$4 $1's $2 by $3 lvls",
    id: "$4 $2 $1 sbsr $3 tkt",
  },
  {
    regex: /スタミナ(\d+)%以上の時/,
    en: "When Stamina is $1% or more",
    id: "Saat Stamina $1% atau lebih",
  },
  {
    regex: /スタミナ(\d+)%以下の時/,
    en: "When Stamina is $1% or less",
    id: "Saat Stamina $1% atau kurang",
  },
  {
    regex: /(\d+)コンボ以上時/,
    en: "When Combo is $1 or more",
    id: "Saat Kombo $1 atau lebih",
  },
  { regex: /\[(\d+)ビート\]/, en: "[$1 Beats]", id: "[$1 Beat]" },
  { regex: /ライブ中1回のみ/, en: "Once per Live", id: "1x per Live" },
];

const GLOSSARY_PROMPT_EN = Object.entries(KEYWORDS)
  .map(([k, v]) => `${k} -> ${v.en}`)
  .join(", ");
const GLOSSARY_PROMPT_ID = Object.entries(KEYWORDS)
  .map(([k, v]) => `${k} -> ${v.id}`)
  .join(", ");
const PATTERNS_PROMPT = PATTERNS.map(
  (p) =>
    `If text matches: "${p.regex.source}"\n   -> English: "${p.en}"\n   -> Indonesian: "${p.id}"`,
).join("\n");

const translateWithRegex = (text, lang) => {
  if (!text || lang === "japanese") return text;
  let t = text;
  PATTERNS.forEach((pat) => {
    t = t.replace(new RegExp(pat.regex, "g"), (match, ...args) => {
      let template = pat[lang];
      for (let i = 0; i < args.length - 2; i++)
        template = template.replace(`$${i + 1}`, args[i]);
      return template;
    });
  });
  Object.keys(KEYWORDS).forEach((k) => {
    const target = KEYWORDS[k][lang] || KEYWORDS[k]["en"];
    t = t.split(k).join(target);
  });
  return t;
};

async function translateFullBatch(dataPayload) {
  if (!API_KEY) return null;
  const MAX_RETRIES = 3;
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const prompt = `Role: Idoly Pride Game Translator.
Task: Translate the following JSON data to Indonesian (id) and English (en).
STRICT GLOSSARY RULES:
Indonesian: ${GLOSSARY_PROMPT_ID}
English: ${GLOSSARY_PROMPT_EN}
STRICT SENTENCE PATTERNS:
${PATTERNS_PROMPT}

Input JSON:
${JSON.stringify(dataPayload)}

Instructions:
1. Apply "STRICT SENTENCE PATTERNS" first.
2. Apply "STRICT GLOSSARY RULES".
3. Return a JSON Object with keys suffixed with "_id" and "_en".`;

      const result = await model.generateContent(prompt);
      const responseText = result.response
        .text()
        .replace(/```json|```/g, "")
        .trim();
      const json = JSON.parse(responseText);
      await new Promise((r) => setTimeout(r, 7000));
      return json;
    } catch (e) {
      attempt++;
      console.error(`⚠️ AI Error (${attempt}): ${e.message}`);
      if (e.message.includes("503") || e.message.includes("overloaded")) {
        await new Promise((r) => setTimeout(r, 10000));
        continue;
      }
      if (e.message.includes("429")) {
        await new Promise((r) => setTimeout(r, 60000));
        continue;
      }
      break;
    }
  }
  return null;
}

// --- MAIN SCRIPT ---
async function main() {
  console.log("🚀 Memulai Sync & Update Card Details (Unified Pipeline)...");

  // 1. LOAD CACHE
  let existingDataMap = new Map();
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      const json = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
      json.forEach((g) =>
        g.data.forEach((c) => existingDataMap.set(c.uniqueId, c)),
      );
      console.log(
        `📦 Data Lama: ${existingDataMap.size} kartu dimuat dari cache.`,
      );
    }
  } catch (e) {
    console.warn("⚠️ Cache tidak ditemukan. Semua kartu akan diproses penuh.");
  }

  // 2. FETCH MASTER DATA
  const [
    cardsRes,
    skillsRes,
    paramsRes,
    rarityRes,
    abilityRes,
    actAbilityRes,
    efficacyRes,
    costumeRes,
    costumeTypeRes,
  ] = await Promise.all([
    fetch(`${BASE_URL}/Card.json`),
    fetch(`${BASE_URL}/Skill.json`),
    fetch(`${BASE_URL}/CardParameter.json`),
    fetch(`${BASE_URL}/CardRarity.json`),
    fetch(`${BASE_URL}/LiveAbility.json`),
    fetch(`${BASE_URL}/ActivityAbility.json`),
    fetch(`${BASE_URL}/SkillEfficacy.json`),
    fetch(`${BASE_URL}/Costume.json`),
    fetch(`${BASE_URL}/CostumeType.json`),
  ]);

  const cardsRaw = await cardsRes.json();
  const skillsRaw = await skillsRes.json();
  const paramsRaw = await paramsRes.json();
  const rarityRaw = await rarityRes.json();
  const abilitiesRaw = await abilityRes.json();
  const actAbilitiesRaw = await actAbilityRes.json();
  const efficacyRaw = await efficacyRes.json();
  const costumeRaw = await costumeRes.json();
  const costumeTypeRaw = await costumeTypeRes.json();

  // 3. INDEXING
  const paramMap = {};
  paramsRaw.forEach((p) => {
    if (!paramMap[p.id]) paramMap[p.id] = {};
    paramMap[p.id][p.level] = {
      value: parseInt(p.value),
      staminaValue: parseInt(p.staminaValue),
    };
  });
  const rarityMap = {};
  rarityRaw.forEach(
    (r) =>
      (rarityMap[r.rarity] = {
        levelLimit: r.levelLimit,
        bonusPermil: r.parameterBonusPermil,
      }),
  );
  const abilityMap = {};
  abilitiesRaw.forEach((a) => (abilityMap[a.id] = a));
  const actAbilityMap = {};
  actAbilitiesRaw.forEach((a) => (actAbilityMap[a.id] = a));
  const efficacyMap = {};
  efficacyRaw.forEach((e) => (efficacyMap[e.id] = e));
  const costumeMap = {};
  costumeRaw.forEach((c) => (costumeMap[c.id] = c));
  const costumeTypeMap = {};
  costumeTypeRaw.forEach((t) => (costumeTypeMap[t.id] = t.name));

  // --- HELPERS DI DALAM LOOP ---
  const calculateStats = (card) => {
    const TARGET_LEVEL = 200;
    const rarityData = rarityMap[10];
    if (!rarityData)
      return { vocal: 0, dance: 0, visual: 0, stamina: 0, total: 0 };
    const bonusMultiplier = rarityData.bonusPermil / 1000;
    const paramData = paramMap[card.cardParameterId]?.[TARGET_LEVEL];
    if (!paramData)
      return { vocal: 0, dance: 0, visual: 0, stamina: 0, total: 0 };

    const vocal = Math.floor(
      paramData.value * (card.vocalRatioPermil / 1000) * bonusMultiplier,
    );
    const dance = Math.floor(
      paramData.value * (card.danceRatioPermil / 1000) * bonusMultiplier,
    );
    const visual = Math.floor(
      paramData.value * (card.visualRatioPermil / 1000) * bonusMultiplier,
    );
    const stamina = Math.floor(
      paramData.staminaValue *
        (card.staminaRatioPermil / 1000) *
        bonusMultiplier,
    );

    const weightedTotal = Math.floor(
      vocal * 0.5 +
        dance * 0.5 +
        visual * 0.5 +
        stamina * 0.8 +
        100 * 2 +
        100 * 3,
    );
    return { vocal, dance, visual, stamina, total: weightedTotal };
  };

  const getRawSkillData = (skillId) => {
    if (!skillId) return null;
    const sData = skillsRaw.find((s) => s.id === skillId);
    if (!sData) return null;
    const lData = sData.levels[sData.levels.length - 1];
    return {
      id: skillId,
      name: sData.name,
      desc: lData.description,
      assetId: sData.assetId,
      type: sData.categoryType,
      ct: lData.coolTime,
      stamina: lData.stamina,
      prob: lData.probabilityPermil,
      effId: lData.skillDetails?.[0]?.efficacyId,
    };
  };

  const getRawYellData = (lId, aId) => {
    let aData = null;
    if (lId && abilityMap[lId]) aData = abilityMap[lId];
    else if (aId && actAbilityMap[aId]) aData = actAbilityMap[aId];
    if (!aData) return null;
    const lData = aData.levels[aData.levels.length - 1];
    return {
      name: aData.name,
      desc: lData ? lData.description : aData.description,
      iconId: aData.id
        .replace(/_/g, "-")
        .replace("aab-", "act-")
        .replace("lba-", "live-"),
    };
  };

  const buildSkill = (raw, cachedText, aiRes, prefix) => {
    if (!raw) return undefined;
    const typeSkill = mapSkillType(raw.type);
    let iconUrl =
      typeSkill === "SP"
        ? `${R2_DOMAIN}/iconSkillYell/img_icon_skill_${raw.assetId}.png`
        : "";
    if (typeSkill !== "SP") {
      let suffix = "unknown";
      const effData = efficacyMap[raw.effId];
      if (effData && ICON_MAP[effData.type]) suffix = ICON_MAP[effData.type];
      iconUrl = `${R2_DOMAIN}/iconSkillYell/img_icon_skill-normal_${suffix}.png`;
    }

    // Jika ada cache text, gunakan itu. Jika tidak, proses dengan AI/Regex.
    let nameText = cachedText?.name || {
      japanese: raw.name,
      global: aiRes
        ? aiRes[`${prefix}_name_en`]
        : translateWithRegex(raw.name, "en"),
      indo: aiRes
        ? aiRes[`${prefix}_name_id`]
        : translateWithRegex(raw.name, "id"),
    };

    let descText = cachedText?.description || {
      japanese: [raw.desc],
      global: [
        aiRes ? aiRes[`${prefix}_desc_en`] : translateWithRegex(raw.desc, "en"),
      ],
      indo: [
        aiRes ? aiRes[`${prefix}_desc_id`] : translateWithRegex(raw.desc, "id"),
      ],
    };

    return {
      typeSkill,
      name: nameText,
      description: descText,
      ct: raw.ct,
      staminaUsed: raw.stamina,
      probability: raw.prob ? raw.prob / 10 : null,
      source: { initialImage: iconUrl },
    };
  };

  const buildYell = (raw, cachedText, aiRes) => {
    if (!raw) return undefined;

    let nameText = cachedText?.name || {
      japanese: raw.name,
      global: aiRes
        ? aiRes[`yell_name_en`]
        : translateWithRegex(raw.name, "en"),
      indo: aiRes ? aiRes[`yell_name_id`] : translateWithRegex(raw.name, "id"),
    };

    let descText = cachedText?.description || {
      japanese: raw.desc,
      global: aiRes
        ? aiRes[`yell_desc_en`]
        : translateWithRegex(raw.desc, "en"),
      indo: aiRes ? aiRes[`yell_desc_id`] : translateWithRegex(raw.desc, "id"),
    };

    return {
      name: nameText,
      description: descText,
      source: {
        initialImage: `${R2_DOMAIN}/iconSkillYell/img_icon_yell-${raw.iconId}.png`,
      },
    };
  };

  // --- 4. PROCESSING LOOP ---
  const groupedData = {};

  for (const card of cardsRaw) {
    if (card.initialRarity < 2) continue; // Skip R1

    const charName = charIdToName[card.characterId] || "Other";
    if (!groupedData[charName])
      groupedData[charName] = { name: charName, data: [] };

    const assetId = card.assetId;
    const rarity = card.initialRarity;
    const cachedCard = existingDataMap.get(assetId);

    // KALKULASI TEKNIS UMUM
    const category = getCardCategory(assetId, rarity);
    const stats = calculateStats(card);

    let costumeTheme = "Idol Outfit";
    for (const part of assetId.split("-")) {
      if (COSTUME_CODE_MAP[part]) {
        costumeTheme = COSTUME_CODE_MAP[part];
        break;
      }
    }

    let costumeImageUrl = null;
    if (card.rewardCostumeId && costumeMap[card.rewardCostumeId]) {
      costumeImageUrl = `${R2_DOMAIN}/costumeIcon/img_cos_thumb_${costumeMap[card.rewardCostumeId].bodyAssetId}.png`;
    }

    const isLinkCard = assetId.includes("link") && card.skillId4 !== "";
    const bIdx = rarity < 5 ? 0 : 1;
    const eIdx = rarity < 5 ? 1 : rarity === 5 && isLinkCard ? 2 : null;
    const hasAwk = eIdx !== null;

    const images = {
      icon: `${R2_DOMAIN}/cardThumb/img_card_thumb_${bIdx}_${assetId}.png`,
      fullNormal: `${R2_DOMAIN}/cardFull/img_card_full_${bIdx}_${assetId}.webp`,
      upperNormal: `${R2_DOMAIN}/cardUpper/img_card_upper_${bIdx}_${assetId}.png`,
      fullEvolved: hasAwk
        ? `${R2_DOMAIN}/cardFull/img_card_full_${eIdx}_${assetId}.webp`
        : null,
      upperEvolved: hasAwk
        ? `${R2_DOMAIN}/cardUpper/img_card_upper_${eIdx}_${assetId}.png`
        : null,
      costume: costumeImageUrl,
    };

    const dateObj = new Date(parseInt(card.releaseDate));
    const releaseDate = !isNaN(dateObj)
      ? dateObj.toISOString().split("T")[0]
      : "1970-01-01";

    const s1Raw = getRawSkillData(card.skillId1);
    const s2Raw = getRawSkillData(card.skillId2);
    const s3Raw = getRawSkillData(card.skillId3);
    const s4Raw = getRawSkillData(card.skillId4);
    const yellRaw = getRawYellData(card.liveAbilityId, card.activityAbilityId);

    // CEK CACHE TEXT TRANSLATION
    const isTranslated =
      cachedCard?.title?.indo &&
      !/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(
        cachedCard.title.indo,
      );

    if (cachedCard && isTranslated) {
      // CACHE HIT: Gabungkan text lama dengan kalkulasi teknis terbaru
      groupedData[charName].data.push({
        uniqueId: assetId,
        initialTitle: assetId,
        title: cachedCard.title,
        description: cachedCard.description,
        obtainMessage: cachedCard.obtainMessage,
        releaseDate,
        category,
        costumeTheme,
        costumeIndex: 0,
        type: mapType(card.type),
        attribute: mapAttribute(card),
        initial: rarity,
        hasAwakening: hasAwk,
        stats,
        images,
        skillOne: buildSkill(s1Raw, cachedCard.skillOne, null, "s1"),
        skillTwo: buildSkill(s2Raw, cachedCard.skillTwo, null, "s2"),
        skillThree: buildSkill(s3Raw, cachedCard.skillThree, null, "s3"),
        skillFour: buildSkill(s4Raw, cachedCard.skillFour, null, "s4"),
        yell: buildYell(yellRaw, cachedCard.yell, null),
      });
    } else {
      // CACHE MISS: Panggil AI untuk terjemahan baru
      console.log(`✨ [AI] Menerjemahkan kartu baru: ${assetId}`);

      const payload = {
        card_title: card.name,
        card_desc: card.description,
        obtain_message: card.obtainMessage,
        ...(s1Raw && { s1_name: s1Raw.name, s1_desc: s1Raw.desc }),
        ...(s2Raw && { s2_name: s2Raw.name, s2_desc: s2Raw.desc }),
        ...(s3Raw && { s3_name: s3Raw.name, s3_desc: s3Raw.desc }),
        ...(s4Raw && { s4_name: s4Raw.name, s4_desc: s4Raw.desc }),
        ...(yellRaw && { yell_name: yellRaw.name, yell_desc: yellRaw.desc }),
      };

      const aiRes = await translateFullBatch(payload);

      groupedData[charName].data.push({
        uniqueId: assetId,
        initialTitle: assetId,
        title: {
          japanese: card.name,
          global: aiRes?.card_title_en || translateWithRegex(card.name, "en"),
          indo: aiRes?.card_title_id || translateWithRegex(card.name, "id"),
        },
        description: {
          japanese: [card.description],
          global: [
            aiRes?.card_desc_en || translateWithRegex(card.description, "en"),
          ],
          indo: [
            aiRes?.card_desc_id || translateWithRegex(card.description, "id"),
          ],
        },
        obtainMessage: {
          japanese: card.obtainMessage,
          global:
            aiRes?.obtain_message_en ||
            translateWithRegex(card.obtainMessage, "en"),
          indo:
            aiRes?.obtain_message_id ||
            translateWithRegex(card.obtainMessage, "id"),
        },
        releaseDate,
        category,
        costumeTheme,
        costumeIndex: 0,
        type: mapType(card.type),
        attribute: mapAttribute(card),
        initial: rarity,
        hasAwakening: hasAwk,
        stats,
        images,
        skillOne: buildSkill(s1Raw, null, aiRes, "s1"),
        skillTwo: buildSkill(s2Raw, null, aiRes, "s2"),
        skillThree: buildSkill(s3Raw, null, aiRes, "s3"),
        skillFour: buildSkill(s4Raw, null, aiRes, "s4"),
        yell: buildYell(yellRaw, null, aiRes),
      });
    }
  }

  // 5. PENYIMPANAN
  const finalOutput = Object.values(groupedData);
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2));
  console.log(
    `\n🎉 Proses Selesai! Seluruh data kartu berhasil disinkronkan ke ${OUTPUT_PATH}`,
  );
}

main();
