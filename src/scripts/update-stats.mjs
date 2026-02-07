import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// --- KONFIGURASI ---
const R2_DOMAIN = "https://api.diveidolypapi.my.id";
const BASE_URL = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
    console.log("🚀 Memulai Update Stats & Data Teknis (Tanpa Menimpa Terjemahan)...");

    // 1. LOAD DATA LAMA (Local)
    const OUTPUT_PATH = path.join(__dirname, '../data/card/cardSources.json');
    let existingDataMap = new Map();
    try {
        if (fs.existsSync(OUTPUT_PATH)) {
            const json = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
            json.forEach(g => g.data.forEach(c => existingDataMap.set(c.uniqueId, c)));
            console.log(`📦 Data Lama: ${existingDataMap.size} kartu dimuat.`);
        }
    } catch (e) { console.warn("⚠️ Tidak ada data lama, semua akan dianggap baru (Untranslated)."); }

    // 2. FETCH DATA BARU (GitHub)
    const [cardsRes, skillsRes, paramsRes, rarityRes, abilityRes, actAbilityRes, efficacyRes, costumeRes, costumeTypeRes] = await Promise.all([
        fetch(`${BASE_URL}/Card.json`), fetch(`${BASE_URL}/Skill.json`), fetch(`${BASE_URL}/CardParameter.json`),
        fetch(`${BASE_URL}/CardRarity.json`), fetch(`${BASE_URL}/LiveAbility.json`), fetch(`${BASE_URL}/ActivityAbility.json`),
        fetch(`${BASE_URL}/SkillEfficacy.json`), fetch(`${BASE_URL}/Costume.json`), fetch(`${BASE_URL}/CostumeType.json`)
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
    const paramMap = {}; paramsRaw.forEach(p => { if(!paramMap[p.id]) paramMap[p.id]={}; paramMap[p.id][p.level] = {value: parseInt(p.value), staminaValue: parseInt(p.staminaValue)}; });
    const rarityMap = {}; rarityRaw.forEach(r => rarityMap[r.rarity] = {levelLimit: r.levelLimit, bonusPermil: r.parameterBonusPermil});
    const abilityMap = {}; abilitiesRaw.forEach(a => abilityMap[a.id] = a);
    const actAbilityMap = {}; actAbilitiesRaw.forEach(a => actAbilityMap[a.id] = a);
    const efficacyMap = {}; efficacyRaw.forEach(e => efficacyMap[e.id] = e);
    const costumeMap = {}; costumeRaw.forEach(c => costumeMap[c.id] = c);
    const costumeTypeMap = {}; costumeTypeRaw.forEach(t => costumeTypeMap[t.id] = t.name);

    
// --- HELPER CALCULATE STATS (Weighted Total) ---
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

    const mental = 100;
    const critical = 100;
    
    // Rumus: (Vocal * 0.5) + (Dance * 0.5) + (Visual * 0.5) + critical + mental
    const weightedTotal = Math.floor((vocal * 0.5) + (dance * 0.5) + (visual * 0.5) + (stamina * 0.8) + (critical * 2) + (mental * 3)
    );

    return { vocal, dance, visual, stamina, total: weightedTotal };
};

    // 4. HELPER UPDATE SKILL (Gabungkan Data Teknis Baru + Teks Lama)
    const updateSkill = (skillId, oldSkillData) => {
        if (!skillId) return undefined;
        const sData = skillsRaw.find(s => s.id === skillId);
        if (!sData) return undefined;
        const lData = sData.levels[sData.levels.length - 1]; // Level max terbaru
        const typeSkill = mapSkillType(sData.categoryType);

        // Tentukan Icon
        let iconUrl = "";
        if (typeSkill === "SP") iconUrl = `${R2_DOMAIN}/iconSkillYell/img_icon_skill_${sData.assetId}.png`;
        else {
            let suffix = "unknown";
            const effId = lData.skillDetails?.[0]?.efficacyId;
            const effData = efficacyMap[effId];
            if (effData && ICON_MAP[effData.type]) suffix = ICON_MAP[effData.type];
            iconUrl = `${R2_DOMAIN}/iconSkillYell/img_icon_skill-normal_${suffix}.png`;
        }

        // GABUNGKAN DATA:
        // Gunakan Teks dari oldSkillData jika ada, jika tidak gunakan teks raw Jepang
        return {
            typeSkill,
            name: oldSkillData?.name || { japanese: sData.name, global: sData.name, indo: sData.name },
            description: oldSkillData?.description || { japanese: [lData.description], global: [lData.description], indo: [lData.description] },
            
            // UPDATE DATA TEKNIS (Selalu pakai yang baru dari GitHub)
            ct: lData.coolTime,
            staminaUsed: lData.stamina,
            probability: lData.probabilityPermil ? lData.probabilityPermil / 10 : null,
            source: { initialImage: iconUrl }
        };
    };

    const updateYell = (lId, aId, oldYellData) => {
        let aData = null;
        if (lId && abilityMap[lId]) aData = abilityMap[lId];
        else if (aId && actAbilityMap[aId]) aData = actAbilityMap[aId];
        if (!aData) return undefined;

        const lData = aData.levels[aData.levels.length - 1];
        const descRaw = lData ? lData.description : aData.description;
        let imageId = aData.id.replace("aab-", "act-").replace("lba-", "live-");

        return {
            name: oldYellData?.name || { japanese: aData.name, global: aData.name, indo: aData.name },
            description: oldYellData?.description || { japanese: descRaw, global: descRaw, indo: descRaw },
            source: { initialImage: `${R2_DOMAIN}/iconSkillYell/img_icon_yell_${imageId}.png` }
        };
    };

    // 5. PROCESSING
    const groupedData = {};

    for (const card of cardsRaw) {
        if (card.initialRarity < 2) continue; // Skip R1

        const charName = charIdToName[card.characterId] || "Other";
        if (!groupedData[charName]) groupedData[charName] = { name: charName, data: [] };

        const cachedCard = existingDataMap.get(card.assetId);

        // --- UPDATE LOGIC ---
        // 1. Gambar & Kostum (Selalu update path/logic)
        const assetId = card.assetId;
        const rarity = card.initialRarity;
        const isLink = assetId.includes("link") && card.skillId4 !== "";
        let bIdx = 1, eIdx = null;
        if(rarity<5) { bIdx=0; eIdx=1; } else if(rarity===5 && isLink) { bIdx=1; eIdx=2; } else { bIdx=1; eIdx=null; }
        const hasAwk = eIdx !== null;
        
        let costumeTheme = cachedCard?.costumeTheme || "Idol Outfit";
        let costumeImageUrl = null;
        if (card.rewardCostumeId) {
            const costumeData = costumeMap[card.rewardCostumeId];
            if (costumeData) {
                costumeImageUrl = `${R2_DOMAIN}/costumeIcon/img_cos_thumb_${costumeData.bodyAssetId}.png`;
                if (!cachedCard?.costumeTheme) { // Hanya update tema jika belum ada (atau mau diupdate paksa silakan)
                    const typeNameJp = costumeTypeMap[costumeData.costumeTypeId];
                    if (typeNameJp) costumeTheme = typeNameJp; 
                }
            }
        }

        const images = {
            icon: `${R2_DOMAIN}/cardThumb/img_card_thumb_${bIdx}_${assetId}.png`,
            fullNormal: `${R2_DOMAIN}/cardFull/img_card_full_${bIdx}_${assetId}.webp`,
            upperNormal: `${R2_DOMAIN}/cardUpper/img_card_upper_${bIdx}_${assetId}.png`,
            fullEvolved: hasAwk ? `${R2_DOMAIN}/cardFull/img_card_full_${eIdx}_${assetId}.webp` : null,
            upperEvolved: hasAwk ? `${R2_DOMAIN}/cardUpper/img_card_upper_${eIdx}_${assetId}.png` : null,
            costume: costumeImageUrl
        };

        // 2. Stats (Selalu hitung ulang dengan rumus terbaru)
        const stats = calculateStats(card, rarityMap, paramMap);

        // 3. Susun Data Final
        // Jika kartu sudah ada, PERTAHANKAN translation. Jika baru, pakai raw Jepang.
        groupedData[charName].data.push({
            uniqueId: assetId,
            initialTitle: assetId,
            
            // --- DATA TEXT (Keep Existing) ---
            title: cachedCard?.title || { japanese: card.name, global: card.name, indo: card.name },
            description: cachedCard?.description || { japanese: [card.description], global: [card.description], indo: [card.description] },
            obtainMessage: cachedCard?.obtainMessage || { japanese: card.obtainMessage, global: card.obtainMessage, indo: card.obtainMessage },
            
            // --- DATA TEKNIS (Always Update) ---
            releaseDate: !isNaN(new Date(parseInt(card.releaseDate))) ? new Date(parseInt(card.releaseDate)).toISOString().split('T')[0] : "1970-01-01",
            category: rarity === 5 ? "Nonlimited" : "General",
            costumeTheme, 
            costumeIndex: 0,
            type: mapType(card.type), 
            attribute: mapAttribute(card),
            initial: rarity, 
            hasAwakening: hasAwk,
            stats,
            images,

            // --- SKILL UPDATE (Gabung Text Lama + Angka Baru) ---
            skillOne: updateSkill(card.skillId1, cachedCard?.skillOne),
            skillTwo: updateSkill(card.skillId2, cachedCard?.skillTwo),
            skillThree: updateSkill(card.skillId3, cachedCard?.skillThree),
            skillFour: updateSkill(card.skillId4, cachedCard?.skillFour),
            yell: updateYell(card.liveAbilityId, card.activityAbilityId, cachedCard?.yell)
        });
    }

    // 6. SAVE
    const finalOutput = Object.values(groupedData);
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(finalOutput, null, 2));
    console.log(`✅ Update Selesai! Stats & Data Teknis diperbarui di ${OUTPUT_PATH}`);
}

main();