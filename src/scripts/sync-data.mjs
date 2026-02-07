import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

// --- KONFIGURASI ---
const R2_DOMAIN = "https://api.diveidolypapi.my.id"; // Pastikan ini domain yang benar
const BASE_URL = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
const API_KEY = process.env.GEMINI_API_KEY;

// CEK STATUS API KEY
if (!API_KEY) {
    console.error("❌ ERROR: API Key tidak ditemukan! Pastikan file .env ada dan library 'dotenv' terinstall.");
    console.log("   Script akan berjalan menggunakan mode REGEX (Tanpa AI).");
} else {
    console.log("✅ API Key ditemukan. Mode AI Aktif.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" } // Paksa output JSON
});

// --- 1. MEMUAT DATA LAMA (CACHE) ---
let existingDataMap = new Map();
const EXISTING_FILE_PATH = path.join(__dirname, '../data/card/cardSources.json');

try {
    if (fs.existsSync(EXISTING_FILE_PATH)) {
        const json = JSON.parse(fs.readFileSync(EXISTING_FILE_PATH, 'utf-8'));
        json.forEach(g => g.data.forEach(c => existingDataMap.set(c.uniqueId, c)));
        console.log(`[CACHE] Memuat ${existingDataMap.size} kartu.`);
    }
} catch (e) { console.warn("[CACHE] Data baru."); }

// --- 2. GLOSSARY & REGEX (ENFORCED RULES) ---
// Kita jadikan ini string untuk prompt AI agar dia patuh
const KEYWORDS = {
    "自身": { en: "Self", id: "Diri Sendiri" }, 
    "全員": { en: "All", id: "Semua" },
    "ボーカル": { en: "Vocal", id: "Vokal" }, 
    "ダンス": { en: "Dance", id: "Dance" },
    "ビジュアル": { en: "Visual", id: "Visual" }, 
    "スコア": { en: "Score", id: "Skor" },
    "上昇": { en: "Up", id: "Naik" }, 
    "低下": { en: "Down", id: "Turun" },
    "回復": { en: "Recover", id: "Pulihkan" }, 
    "消費": { en: "Consume", id: "Konsumsi" },
    "ビート": { en: "Beats", id: "Beat" },
    "コンボ": { en: "Combo", id: "Kombo" },
    "クリティカル率": { en: "Crit Rate", id: "Rate Critical" },
    "クリティカル係数": { en: "Crit Damage", id: "Damage Critical" },
    "集目": { en: "Focus", id: "Fokus" },
    "強化効果": { en: "Buffs", id: "Buff" },
    "低下効果": { en: "Debuffs", id: "Debuff" },
    "成功率": { en: "Success Rate", id: "Rate Sukses" },
    "スキル成功率": { en: "Skill Success Rate", id: "Rate Sukses Skill" }
};

const PATTERNS = [
    { regex: /(\d+)%のスコア獲得/, en: "Gain $1% Score", id: "Perolehan Skor $1%" },
    { regex: /(.+)に(\d+)段階(.+)効果\[(\d+)ビート\]/, en: "Grants $2 lvls of $3 to $1 [$4 Beats]", id: "Memberi $1 $3 $2 tingkat [$4 Beat]" },
    { regex: /(.+)の(.+)(\d+)段階(上昇|低下)/, en: "$4 $1's $2 by $3 lvls", id: "$4 $2 $1 sbsr $3 tkt" },
    { regex: /スタミナ(\d+)%以上の時/, en: "When Stamina is $1% or more", id: "Saat Stamina $1% atau lebih" },
    { regex: /スタミナ(\d+)%以下の時/, en: "When Stamina is $1% or less", id: "Saat Stamina $1% atau kurang" },
    { regex: /(\d+)コンボ以上時/, en: "When Combo is $1 or more", id: "Saat Kombo $1 atau lebih" },
    { regex: /\[(\d+)ビート\]/, en: "[$1 Beats]", id: "[$1 Beat]" },
    { regex: /ライブ中1回のみ/, en: "Once per Live", id: "1x per Live" }
];

// Buat string aturan glosarium untuk AI
const GLOSSARY_PROMPT_EN = Object.entries(KEYWORDS).map(([k, v]) => `${k} -> ${v.en}`).join(", ");
const GLOSSARY_PROMPT_ID = Object.entries(KEYWORDS).map(([k, v]) => `${k} -> ${v.id}`).join(", ");

// Regex Fallback (Dipakai jika AI Gagal Total atau quota habis)
const translateWithRegex = (text, lang) => {
    if (!text || lang === 'japanese') return text;
    let t = text;

    // 1. Terapkan PATTERNS (Struktur Kalimat)
    PATTERNS.forEach(pat => {
        t = t.replace(new RegExp(pat.regex, 'g'), (match, ...args) => {
            let template = pat[lang];
            // Ganti placeholder $1, $2, dst dengan hasil capture regex
            for (let i = 0; i < args.length - 2; i++) {
                template = template.replace(`$${i + 1}`, args[i]);
            }
            return template;
        });
    });

    // 2. Terapkan KEYWORDS (Kosakata)
    Object.keys(KEYWORDS).forEach(k => {
        const target = KEYWORDS[k][lang] || KEYWORDS[k]['en'];
        t = t.split(k).join(target);
    });

    return t;
};

// Ubah Regex jadi instruksi teks buat AI
const PATTERNS_PROMPT = PATTERNS.map(p => {
    // p.regex.source mengambil string mentah dari regex (tanpa /.../)
    return `If text matches: "${p.regex.source}"\n   -> English: "${p.en}"\n   -> Indonesian: "${p.id}"`;
}).join("\n");

// --- 3. AI BATCHING (FULL DATA: Card + Skills + Yell) ---
async function translateFullBatch(dataPayload) {
    if (!API_KEY) return null; 

    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const prompt = `
            Role: Idoly Pride Game Translator.
            Task: Translate the following JSON data to Indonesian (id) and English (en).
            
            STRICT GLOSSARY RULES (Do NOT deviate, replace keywords):
            Indonesian: ${GLOSSARY_PROMPT_ID}
            English: ${GLOSSARY_PROMPT_EN}

            STRICT SENTENCE PATTERNS (Priority High):
            Follow these Regex-like replacement rules. $1, $2, etc are placeholders for numbers or text found in the source.
            ${PATTERNS_PROMPT}
            
            Input JSON:
            ${JSON.stringify(dataPayload)}

            Instructions:
            1. Apply "STRICT SENTENCE PATTERNS" first for sentence structure.
            2. Apply "STRICT GLOSSARY RULES" for specific terms (Vocal, Dance, etc).
            3. Return a JSON Object with keys suffixed with "_id" and "_en".
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text().replace(/```json|```/g, '').trim();
            const json = JSON.parse(responseText);

            await new Promise(r => setTimeout(r, 7000));

            return json;

        } catch (e) {
            attempt++;
            console.error(`⚠️ AI Error (${attempt}): ${e.message}`);
            
            if (e.message.includes('503') || e.message.includes('overloaded')) {
                console.log("⏳ Server Busy. Wait 10s...");
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }
            if (e.message.includes('429')) {
                console.log("⏳ Rate Limit. Wait 60s...");
                await new Promise(r => setTimeout(r, 60000));
                continue;
            }
            break; 
        }
    }
    return null; // Gagal
}

// --- MAPPERS ---
const charIdToName = {
  "char-mna": "Mana", "char-ktn": "Kotono", "char-skr": "Sakura",
  "char-rei": "Rei", "char-ngs": "Nagisa", "char-hrk": "Haruko",
  "char-ski": "Saki", "char-suz": "Suzu", "char-mei": "Mei",
  "char-szk": "Shizuku", "char-rui": "Rui", "char-yu": "Yuu",
  "char-smr": "Sumire", "char-rio": "Rio", "char-aoi": "Aoi",
  "char-ai": "Ai", "char-kkr": "Kokoro", "char-chs": "Chisa",
  "char-mhk": "Miho", "char-kan": "Kana", "char-kor": "Fran",
};

const mapType = (id) => (["Unknown","Scorer","Buffer","Supporter"][id] || "Unknown");

const mapAttribute = (card) => {
    const max = Math.max(card.vocalRatioPermil, card.danceRatioPermil, card.visualRatioPermil);
    return max === card.vocalRatioPermil ? "Vocal" : max === card.danceRatioPermil ? "Dance" : "Visual";
};

const mapSkillType = (t) => ({1:"SP",2:"A",3:"P"}[t] || "A");

const ICON_MAP = {
    1: "score-up", 2: "vocal-up", 3: "dance-up", 4: "visual-up", 5: "stamina-recovery", 
    6: "critical-rate-up", 7: "critical-score-up", 8: "draw-critical-rate-up", 9: "beat-score-up",
    11: "vocal-down", 12: "dance-down", 13: "visual-down", 15: "stamina-consumption-increase",
    19: "active-skill-score-up", 20: "special-skill-score-up", 21: "a-skill-level-up", 
    27: "combo-score-up", 28: "tension-up", 29: "focus", 30: "stealth", 31: "mental-up", 
    32: "stamina-consumption-reduction", 33: "ct-reduction", 34: "skill-success-rate-up",
    45: "audience-amount-increase", 46: "audience-amount-reduction", 53: "score-multiplier-add", 
    60: "active-score-multiplier-add", 64: "passive-skill-score-up",
    101: "remove-buffs", 102: "remove-debuffs", 103: "protection", 107: "slump", 108: "weakness-effect-reflection"
};

// --- MAIN PROCESS ---
async function main() {
    try {
        console.log("Mulai Sinkronisasi V19 (Full Translation)...");

        const [cardsRes, skillsRes, paramsRes, rarityRes, abilityRes, actAbilityRes, efficacyRes, costumeRes, costumeTypeRes] = await Promise.all([
        fetch(`${BASE_URL}/Card.json`),
        fetch(`${BASE_URL}/Skill.json`),
        fetch(`${BASE_URL}/CardParameter.json`),
        fetch(`${BASE_URL}/CardRarity.json`),
        fetch(`${BASE_URL}/LiveAbility.json`),
        fetch(`${BASE_URL}/ActivityAbility.json`),
        fetch(`${BASE_URL}/SkillEfficacy.json`),
        fetch(`${BASE_URL}/Costume.json`),
        fetch(`${BASE_URL}/CostumeType.json`),

        fetch(`${BASE_URL}/CardRank.json`),
        fetch(`${BASE_URL}/CardLevel.json`),
        fetch(`${BASE_URL}/CardLevelRelease.json`),
        fetch(`${BASE_URL}/CardEvolutionLevel.json`),
        fetch(`${BASE_URL}/CardEvolutionLevelRelease.json`),
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

    // Indexing
    const paramMap = {}; 
    paramsRaw.forEach(p => { 
        if(!paramMap[p.id]) paramMap[p.id]={}; 
        paramMap[p.id][p.level] = {value: parseInt(p.value), staminaValue: parseInt(p.staminaValue)}; 
    });
    
    const rarityMap = {}; 
    rarityRaw.forEach(r => rarityMap[r.rarity] = {levelLimit: r.levelLimit, bonusPermil: r.parameterBonusPermil});
    
    const abilityMap = {}; abilitiesRaw.forEach(a => abilityMap[a.id] = a);
    const actAbilityMap = {}; actAbilitiesRaw.forEach(a => actAbilityMap[a.id] = a);
    const efficacyMap = {}; efficacyRaw.forEach(e => efficacyMap[e.id] = e);
    const costumeMap = {}; costumeRaw.forEach(c => costumeMap[c.id] = c);
    const costumeTypeMap = {}; costumeTypeRaw.forEach(t => costumeTypeMap[t.id] = t.name);

    // --- HELPER FUNCTIONS (DEFINISI DI SINI AGAR BISA DIPAKAI DI MANA SAJA DALAM LOOP) ---
    
    const calculateStats = (card) => {
        const TARGET_LEVEL = 200;
        const rarityData = rarityMap[10];
        if (!rarityData) return { vocal: 0, dance: 0, visual: 0, stamina: 0, total: 0 };

        const bonusMultiplier = rarityData.bonusPermil / 1000;
        const paramData = paramMap[card.cardParameterId]?.[TARGET_LEVEL];
        
        if (!paramData) return { vocal: 0, dance: 0, visual: 0, stamina: 0, total: 0 };
        
        const vocal = Math.floor(paramData.value * (card.vocalRatioPermil / 1000) * bonusMultiplier);
        const dance = Math.floor(paramData.value * (card.danceRatioPermil / 1000) * bonusMultiplier);
        const visual = Math.floor(paramData.value * (card.visualRatioPermil / 1000) * bonusMultiplier);
        const stamina = Math.floor(paramData.staminaValue * (card.staminaRatioPermil / 1000) * bonusMultiplier);

        const mental = Math.floor((100) * 2);
        const critical = Math.floor((100) * 3);
        
        // Rumus: (Vocal * 0.5) + (Dance * 0.5) + (Visual * 0.5) + critical + mental
        const weightedTotal = Math.floor((vocal * 0.5) + (dance * 0.5) + (visual * 0.5) + critical + mental
        );

        return { vocal, dance, visual, stamina, total: weightedTotal };
    };

    const getRawSkillData = (skillId) => {
        if (!skillId) return null;
        const sData = skillsRaw.find(s => s.id === skillId);
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
            effId: lData.skillDetails?.[0]?.efficacyId 
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
            iconId: aData.id.replace("aab-", "act-").replace("lba-", "live-")
        };
    };

    // --- LOOP UTAMA ---
    const groupedData = {};
    
    // // Test 2 cards first
    // const targetCards = cardsRaw.slice(0, 150);

    for (const card of cardsRaw) {
        if (card.initialRarity < 2) continue;

        const charName = charIdToName[card.characterId] || "Other";
        if (!groupedData[charName]) groupedData[charName] = { name: charName, data: [] };

        const cachedCard = existingDataMap.get(card.assetId);

        // --- PREPARE DATA ---
        const s1 = getRawSkillData(card.skillId1);
        const s2 = getRawSkillData(card.skillId2);
        const s3 = getRawSkillData(card.skillId3);
        const s4 = getRawSkillData(card.skillId4);
        const yell = getRawYellData(card.liveAbilityId, card.activityAbilityId);
        
        // --- CACHE SKIP CHECK ---
        const isTranslated = cachedCard?.title?.indo && !/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(cachedCard.title.indo);
        if (cachedCard && isTranslated) {
            // Re-construct using cached text + fresh stats/images
            // Kita harus hati-hati di sini: Cache sudah punya skillOne, dll yang sudah terstruktur.
            // Kita update structure teknisnya saja.
            groupedData[charName].data.push({
                ...cachedCard,
                stats: calculateStats(card),
                hasAwakening: card.initialRarity === 5 && card.assetId.includes("link"), // Simplified logic check
                // Images recalculation logic (simplified for brevity, use full logic from V17)
            });
            continue; 
        }

        console.log(`[AI] Translating FULL: ${card.assetId}`);

        // --- 1. BUILD PAYLOAD ---
        const payload = {
            card_title: card.name,
            card_desc: card.description,
            obtain_message: card.obtainMessage,
            ...(s1 && { s1_name: s1.name, s1_desc: s1.desc }),
            ...(s2 && { s2_name: s2.name, s2_desc: s2.desc }),
            ...(s3 && { s3_name: s3.name, s3_desc: s3.desc }),
            ...(s4 && { s4_name: s4.name, s4_desc: s4.desc }),
            ...(yell && { yell_name: yell.name, yell_desc: yell.desc })
        };

        // --- 2. CALL AI ---
        const aiRes = await translateFullBatch(payload);

        // --- 3. HELPER PROCESS RESULT ---
        // Fungsi pembantu untuk menyusun objek Skill setelah dapat teks dari AI
        const formatSkill = (raw, prefix) => {
            if (!raw) return undefined;
            const typeSkill = mapSkillType(raw.type);
            let iconUrl = "";
            if (typeSkill === "SP") {
                iconUrl = `${R2_DOMAIN}/iconSkillYell/img_icon_skill_${raw.assetId}.png`;
            } else {
                let suffix = "unknown";
                const effData = efficacyMap[raw.effId];
                if (effData && ICON_MAP[effData.type]) suffix = ICON_MAP[effData.type];
                iconUrl = `${R2_DOMAIN}/iconSkillYell/img_icon_skill-normal_${suffix}.png`;
            }

            // AMBIL TEXT DARI AI, ATAU FALLBACK KE REGEX JIKA AI NULL
            const nameJp = raw.name;
            const descJp = raw.desc;
            
            // Cek apakah AI mengembalikan key yang diminta
            const nameId = aiRes ? aiRes[`${prefix}_name_id`] : translateWithRegex(nameJp, 'id');
            const nameEn = aiRes ? aiRes[`${prefix}_name_en`] : translateWithRegex(nameJp, 'en');
            const descId = aiRes ? aiRes[`${prefix}_desc_id`] : translateWithRegex(descJp, 'id');
            const descEn = aiRes ? aiRes[`${prefix}_desc_en`] : translateWithRegex(descJp, 'en');

            return {
                typeSkill,
                name: { japanese: nameJp, global: nameEn, indo: nameId },
                description: { japanese: [descJp], global: [descEn], indo: [descId] },
                ct: raw.ct, staminaUsed: raw.stamina, probability: raw.prob ? raw.prob / 10 : null,
                source: { initialImage: iconUrl }
            };
        };

        const formatYell = (raw) => {
            if (!raw) return undefined;
            const nameId = aiRes ? aiRes[`yell_name_id`] : translateWithRegex(raw.name, 'id');
            const nameEn = aiRes ? aiRes[`yell_name_en`] : translateWithRegex(raw.name, 'en');
            const descId = aiRes ? aiRes[`yell_desc_id`] : translateWithRegex(raw.desc, 'id');
            const descEn = aiRes ? aiRes[`yell_desc_en`] : translateWithRegex(raw.desc, 'en');

            return {
                name: { japanese: raw.name, global: nameEn, indo: nameId },
                description: { japanese: raw.desc, global: descEn, indo: descId },
                source: { initialImage: `${R2_DOMAIN}/iconSkillYell/img_yell_icon_${raw.iconId}.png` }
            };
        };

        // --- 4. ASSEMBLE ---
        // Setup Images Logic (Full)
        const dateObj = new Date(parseInt(card.releaseDate));
        const formattedDate = !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : "1970-01-01";
        const assetId = card.assetId;
        const rarity = card.initialRarity;
        
        const isLinkCard = assetId.includes("link") && card.skillId4 !== "";
        let baseIndex = 1; let evolvedIndex = null; 
        if (rarity < 5) { baseIndex = 0; evolvedIndex = 1; } 
        else if (rarity === 5 && isLinkCard) { baseIndex = 1; evolvedIndex = 2; } 
        else { baseIndex = 1; evolvedIndex = null; }
        const hasEvolvedArt = evolvedIndex !== null;
        
        const R2_CARDS = `${R2_DOMAIN}`; 
        const R2_COSTUMES = `${R2_DOMAIN}/costumeIcon`;

        let costumeTheme = "Idol Outfit";
        let costumeImageUrl = null;
        if (card.rewardCostumeId) {
            const costumeData = costumeMap[card.rewardCostumeId];
            if (costumeData) {
                const typeNameJp = costumeTypeMap[costumeData.costumeTypeId];
                if (typeNameJp) costumeTheme = translateWithRegex(typeNameJp, 'en'); 
                costumeImageUrl = `${R2_COSTUMES}/img_cos_thumb_${costumeData.bodyAssetId}.png`;
            }
        }

        const images = {
            icon: `${R2_CARDS}/cardThumb/img_card_thumb_${baseIndex}_${assetId}.png`,
            fullNormal: `${R2_CARDS}/cardFull/img_card_full_${baseIndex}_${assetId}.webp`,
            upperNormal: `${R2_CARDS}/cardUpper/img_card_upper_${baseIndex}_${assetId}.png`,
            fullEvolved: hasEvolvedArt ? `${R2_CARDS}/cardFull/img_card_full_${evolvedIndex}_${assetId}.webp` : null,
            upperEvolved: hasEvolvedArt ? `${R2_CARDS}/cardUpper/img_card_upper_${evolvedIndex}_${assetId}.png` : null,
            costume: costumeImageUrl
        };

        if (cachedCard && isTranslated) {
            console.log(`[SKIP] ${assetId} sudah diterjemahkan.`);
            // Update Stats, Skill, Images (biar selalu fresh link-nya), tapi Text pakai cache
            groupedData[charName].data.push({
                ...cachedCard,
                stats: calculateStats(card),
                hasAwakening: hasEvolvedArt, // Update logic awakening
                images: images,              // Update logic image link
                skillOne: processSkillHybrid(card.skillId1), // Re-process skill (hanya regex)
                skillTwo: processSkillHybrid(card.skillId2),
                skillThree: processSkillHybrid(card.skillId3),
                skillFour: processSkillHybrid(card.skillId4),
                yell: processYellHybrid(card.liveAbilityId, card.activityAbilityId)
            });
            continue; 
        }

        // --- TRANSLATE AI (Hanya untuk kartu baru) ---

        groupedData[charName].data.push({
            uniqueId: assetId,
            initialTitle: assetId,
            title: { 
                japanese: card.name, 
                global: aiRes?.card_title_en || translateWithRegex(card.name, 'en'), 
                indo: aiRes?.card_title_id || translateWithRegex(card.name, 'id')
            },
            description: { 
                japanese: [card.description], 
                global: [aiRes?.card_desc_en || translateWithRegex(card.description, 'en')], 
                indo: [aiRes?.card_desc_id || translateWithRegex(card.description, 'id')]
            },
            obtainMessage: {
                japanese: card.obtainMessage,
                global: aiRes?.obtain_message_en || translateWithRegex(card.obtainMessage, 'en'),
                indo: aiRes?.obtain_message_id || translateWithRegex(card.obtainMessage, 'id')
            },
            releaseDate: formattedDate,
            category: rarity === 5 ? "Nonlimited" : "General",
            costumeTheme: "Idol Outfit", // Placeholder
            costumeIndex: 0,
            type: mapType(card.type),
            attribute: mapAttribute(card),
            initial: rarity,
            hasAwakening: hasEvolvedArt,
            stats: calculateStats(card),
            skillOne: formatSkill(s1, 's1'),
            skillTwo: formatSkill(s2, 's2'),
            skillThree: formatSkill(s3, 's3'),
            skillFour: formatSkill(s4, 's4'),
            yell: formatYell(yell),
            images: images
        });
    }

    const finalOutput = Object.values(groupedData);
    const outputPath = path.join(__dirname, '../data/card/cardSources.json'); 
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));
    console.log(`Update Sukses! Tersimpan di ${outputPath}`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();