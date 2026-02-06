import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- KONFIGURASI ---
// 1. URL R2 Base (Root Domain)
const R2_DOMAIN = "https://api.diveidolypapi.my.id"; 

// 2. URL GitHub (Perhatikan Case Sensitive!)
const BASE_URL = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";

// Setup __dirname untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MAPPING ICON SKILL (NORMAL) ---
// Mencocokkan 'type' dari SkillEfficacy.json ke nama file di skill_names.txt
const ICON_MAP = {
    // Basic Status Up
    1: "score-up",
    2: "vocal-up",
    3: "dance-up",
    4: "visual-up",
    5: "stamina-recovery", 
    6: "critical-rate-up",
    7: "critical-score-up", // Atau critical-coefficient-up
    8: "draw-critical-rate-up", // Sepertinya visual higher
    9: "beat-score-up",
    
    // Status Down
    11: "vocal-down",
    12: "dance-down",
    13: "visual-down",
    15: "stamina-consumption-increase",

    // Special & Active Buffs
    19: "active-skill-score-up",
    20: "special-skill-score-up",
    21: "a-skill-level-up", // Assumption
    27: "combo-score-up",
    28: "tension-up",
    29: "focus", // Shuumoku
    30: "stealth",
    31: "mental-up", // Spirit/Mental
    32: "stamina-consumption-reduction",
    33: "ct-reduction",
    34: "skill-success-rate-up",
    
    // Complex Effects
    45: "audience-amount-increase",
    46: "audience-amount-reduction",
    53: "score-multiplier-add", // SP score add
    60: "active-score-multiplier-add",
    64: "passive-skill-score-up",
    
    // Debuff Removal/Protection
    101: "remove-buffs",
    102: "remove-debuffs",
    103: "protection", // Block debuff
    107: "slump", // Fuchou
    108: "weakness-effect-reflection"
};

// --- GLOSSARY TRANSLATE ---
const GLOSSARY = [
  { jp: /ビート/g, en: " Beats", id: " Beat" },
  { jp: /コンボ/g, en: " Combo", id: " Kombo" },
  { jp: /クリティカル/g, en: "Critical", id: "Critical" },
  { jp: /スタミナ/g, en: "Stamina", id: "Stamina" },
  { jp: /クールタイム/g, en: "Cool Time", id: "Cool Time" },
  { jp: /CT/g, en: "CT", id: "CT" },
  { jp: /レベル/g, en: "Level", id: "Level" },
  { jp: /自身/g, en: "Self", id: "Diri Sendiri" },
  { jp: /全員/g, en: "All", id: "Semua" },
  { jp: /スコアラー/g, en: "Scorer", id: "Scorer" },
  { jp: /バッファー/g, en: "Buffer", id: "Buffer" },
  { jp: /サポーター/g, en: "Supporter", id: "Supporter" },
  { jp: /隣接アイドル/g, en: "Neighbors", id: "Idol Sebelah" },
  { jp: /センター/g, en: "Center", id: "Center" },
  { jp: /対象/g, en: "Target", id: "Target" },
  { jp: /ボーカル/g, en: "Vocal", id: "Vocal" },
  { jp: /ダンス/g, en: "Dance", id: "Dance" },
  { jp: /ビジュアル/g, en: "Visual", id: "Visual" },
  { jp: /スコア上昇/g, en: "Score Up", id: "Peningkatan Skor" },
  { jp: /コンボスコア上昇/g, en: "Combo Score Up", id: "Peningkatan Skor Kombo" },
  { jp: /テンションUP/g, en: "Tension Up", id: "Tension Up" },
  { jp: /集目効果/g, en: "Focus", id: "Fokus" },
  { jp: /クリティカル率上昇/g, en: "Crit Rate Up", id: "Rate Critical Naik" },
  { jp: /クリティカル係数上昇/g, en: "Crit Damage Up", id: "Damage Critical Naik" },
  { jp: /強化効果消去/g, en: "Remove Buffs", id: "Hapus Buff" },
  { jp: /低下効果回復/g, en: "Remove Debuffs", id: "Hapus Debuff" },
  { jp: /ステルス/g, en: "Stealth", id: "Stealth" },
  { jp: /不調/g, en: "Slump", id: "Slump" },
  { jp: /消費/g, en: "Consumes", id: "Konsumsi" },
  { jp: /回復/g, en: "Recover", id: "Pulihkan" },
  { jp: /段階/g, en: " Lvls", id: " Tkt" },
  { jp: /時/g, en: " when ", id: " saat " },
  { jp: /以上/g, en: " or more ", id: " atau lebih " },
  { jp: /以下/g, en: " or less ", id: " atau kurang " },
  { jp: /成功率/g, en: "Success Rate", id: "Rate Sukses" },
  { jp: /上昇/g, en: " Up", id: " Naik" }, 
  { jp: /効果/g, en: " Effect", id: " Efek" },
  
  // --- GLOSSARY KOSTUM BARU ---
  { jp: /私服/g, en: "Casual", id: "Kasual" },
  { jp: /アイドル衣装/g, en: "Idol Outfit", id: "Kostum Idol" },
  { jp: /水着/g, en: "Swimsuit", id: "Baju Renang" },
  { jp: /パジャマ/g, en: "Pajamas", id: "Piyama" },
  { jp: /制服/g, en: "School Uniform", id: "Seragam Sekolah" },
  { jp: /親善大使/g, en: "Ambassador", id: "Duta Persahabatan" },
  { jp: /一日署長/g, en: "Police Chief", id: "Kepala Polisi" },
];

const translateText = (text, lang) => {
  if (!text) return "";
  let translated = text;
  GLOSSARY.forEach(entry => { translated = translated.replace(entry.jp, entry[lang]); });
  return translated.replace(/\s+/g, ' ').trim().replace(/\[ /g, '[').replace(/ \]/g, ']');
};

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

const mapType = (id) => {
  const map = { 1: "Scorer", 2: "Buffer", 3: "Supporter" };
  return map[id] || "Unknown";
};

const mapAttribute = (card) => {
  const v = card.vocalRatioPermil || 0;
  const d = card.danceRatioPermil || 0;
  const vi = card.visualRatioPermil || 0;
  const max = Math.max(v, d, vi);
  if (max === v) return "Vocal";
  if (max === d) return "Dance";
  if (max === vi) return "Visual";
  return "Unknown";
};

// --- LOGIKA TIPE SKILL (SP/A/P) ---
const mapSkillType = (categoryType) => {
  const types = { 1: "SP", 2: "A", 3: "P" };
  return types[categoryType] || "A"; 
};

async function main() {
  console.log("Mengambil data...");

  try {
    // FIX: Menggunakan CamelCase (Huruf Besar Awal) agar sesuai dengan repo GitHub
    const [cardsRes, skillsRes, paramsRes, rarityRes, abilityRes, actAbilityRes , efficacyRes, costumeRes, costumeTypeRes] = await Promise.all([
      fetch(`${BASE_URL}/Card.json`),
      fetch(`${BASE_URL}/Skill.json`),
      fetch(`${BASE_URL}/CardParameter.json`),
      fetch(`${BASE_URL}/CardRarity.json`),
      fetch(`${BASE_URL}/LiveAbility.json`),
      fetch(`${BASE_URL}/ActivityAbility.json`),
      fetch(`${BASE_URL}/SkillEfficacy.json`),
      fetch(`${BASE_URL}/Costume.json`),      
      fetch(`${BASE_URL}/CostumeType.json`)   
    ]);

    // Cek status response sebelum parse
    if (!cardsRes.ok) throw new Error(`Gagal fetch Card.json: ${cardsRes.statusText}`);

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
      if (!paramMap[p.id]) paramMap[p.id] = {};
      paramMap[p.id][p.level] = { value: parseInt(p.value), staminaValue: parseInt(p.staminaValue) };
    });

    const rarityMap = {};
    rarityRaw.forEach(r => {
      rarityMap[r.rarity] = { levelLimit: r.levelLimit, bonusPermil: r.parameterBonusPermil };
    });

    const abilityMap = {};
    abilitiesRaw.forEach(a => { abilityMap[a.id] = a; });

    // INDEXING ActivityAbility (NEW)
    const actAbilityMap = {};
    actAbilitiesRaw.forEach(a => { actAbilityMap[a.id] = a; });

    const efficacyMap = {};
    efficacyRaw.forEach(e => { efficacyMap[e.id] = e; });

    // Indexing Costume (NEW)
    const costumeMap = {};
    costumeRaw.forEach(c => { costumeMap[c.id] = c; });

    // Indexing Costume Type (NEW)
    const costumeTypeMap = {};
    costumeTypeRaw.forEach(t => { costumeTypeMap[t.id] = t.name; });

    const calculateStats = (card) => {
      const rarityData = rarityMap[card.initialRarity];
      if (!rarityData) return { vocal: 0, dance: 0, visual: 0, stamina: 0, total: 0 };
      const targetLevel = rarityData.levelLimit;
      const bonusMultiplier = rarityData.bonusPermil / 1000;
      const paramData = paramMap[card.cardParameterId]?.[targetLevel];
      if (!paramData) return { vocal: 0, dance: 0, visual: 0, stamina: 0, total: 0 };
      
      const vocal = Math.floor(paramData.value * (card.vocalRatioPermil / 1000) * bonusMultiplier);
      const dance = Math.floor(paramData.value * (card.danceRatioPermil / 1000) * bonusMultiplier);
      const visual = Math.floor(paramData.value * (card.visualRatioPermil / 1000) * bonusMultiplier);
      const stamina = Math.floor(paramData.staminaValue * (card.staminaRatioPermil / 1000) * bonusMultiplier);
      
      return { vocal, dance, visual, stamina, total: vocal + dance + visual };
    };

    // --- PROSES SKILL UTAMA ---
    const processSkill = (skillId) => {
      if (!skillId) return undefined;
      const skillData = skillsRaw.find(s => s.id === skillId);
      if (!skillData) return undefined;
      const levelData = skillData.levels[skillData.levels.length - 1];
      if (!levelData) return undefined;

      const typeSkill = mapSkillType(skillData.categoryType);
      
      let iconUrl = "";
      
      // LOGIKA PENAMAAN FILE ICON
      if (typeSkill === "SP") {
          // SP biasanya punya icon unik (sesuai Asset ID)
          iconUrl = `${R2_DOMAIN}/iconSkillYell/img_icon_skill_${skillData.assetId}.png`;
      } else {
          // Skill A & P biasanya menggunakan icon generik berdasarkan Efficacy (Efek)
          let suffix = "unknown";
          
          // Ambil Efficacy pertama
          if (levelData.skillDetails && levelData.skillDetails.length > 0) {
              const effId = levelData.skillDetails[0].efficacyId;
              const effData = efficacyMap[effId];
              
              if (effData && ICON_MAP[effData.type]) {
                  suffix = ICON_MAP[effData.type];
              }
          }
          
          // Format: img_icon_skill-normal_[SUFFIX].png
          iconUrl = `${R2_DOMAIN}/iconSkillYell/img_icon_skill-normal_${suffix}.png`;
      }

      return {
        typeSkill: typeSkill,
        name: { 
            japanese: skillData.name, 
            global: translateText(skillData.name, 'en'), 
            indo: translateText(skillData.name, 'id') 
        },
        description: { 
            japanese: [levelData.description], 
            global: [translateText(levelData.description, 'en')], 
            indo: [translateText(levelData.description, 'id')] 
        },
        ct: levelData.coolTime,
        staminaUsed: levelData.stamina,
        probability: levelData.probabilityPermil ? levelData.probabilityPermil / 10 : null,
        
        source: {
            initialImage: iconUrl,
            // Untuk sekarang biarkan undefined, karena aset gambarnya sepertinya sudah digabung
            topRightImage: undefined, 
            bottomRightImage: undefined,
            color: typeSkill === "SP" ? "rainbow" : (typeSkill === "P" ? "yellow" : "blue")
        }
      };
    };

    const processYell = (liveAbilityId, activityAbilityId) => {
      let abilityData = null;
      
      if (liveAbilityId && abilityMap[liveAbilityId]) {
          abilityData = abilityMap[liveAbilityId];
      } 
      else if (activityAbilityId && actAbilityMap[activityAbilityId]) {
          abilityData = actAbilityMap[activityAbilityId];
      }

      if (!abilityData) return undefined;

      const levelData = abilityData.levels[abilityData.levels.length - 1];
      const desc = levelData ? levelData.description : abilityData.description;
      
      // FIX: Mapping ID Data -> ID Gambar
      // aab-xxx -> act-xxx
      // lba-xxx -> live-xxx
      let imageId = abilityData.id;
      imageId = imageId.replace("aab-", "act-");
      imageId = imageId.replace("lba-", "live-");

      const imageName = `img_icon_yell_${imageId}.png`;

      return {
        name: { 
            japanese: abilityData.name, 
            global: translateText(abilityData.name, 'en'), 
            indo: translateText(abilityData.name, 'id') 
        },
        description: { 
            japanese: desc, 
            global: translateText(desc, 'en'), 
            indo: translateText(desc, 'id') 
        },
        source: {
             initialImage: `${R2_DOMAIN}/iconSkillYell/${imageName}`
        }
      };
    };

    const groupedData = {};

    cardsRaw.forEach(card => {
        // Filter Rarity 1 jika tidak diperlukan (Rarity 1 biasanya cuma material/xp)
        if (card.initialRarity < 2) return; 

        const charName = charIdToName[card.characterId] || "Other";
        if (!groupedData[charName]) groupedData[charName] = { name: charName, data: [] };

        const dateObj = new Date(parseInt(card.releaseDate));
        const formattedDate = !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : "1970-01-01";

        const assetId = card.assetId;
        const rarity = card.initialRarity;
        
        // --- LOGIKA INDEKS GAMBAR (REVISI) ---
        // Link Card ditandai dengan "link" di ID DAN punya skill 4
        const isLinkCard = assetId.includes("link") && card.skillId4 !== "";
        
        let baseIndex = 1;      // Default index untuk Base Art
        let evolvedIndex = null; // Default index untuk Evolved Art (null jika tidak ada)

        if (rarity < 5) {
            // KASUS 1: Rarity 2, 3, 4
            // Base = 0, Evolved = 1
            baseIndex = 0;
            evolvedIndex = 1;
        } else if (rarity === 5 && isLinkCard) {
            // KASUS 2: Rarity 5 Link/Awakening
            // Base = 1, Evolved = 2
            baseIndex = 1;
            evolvedIndex = 2;
        } else {
            // KASUS 3: Rarity 5 Standard (Fes/Regular)
            // Base = 1, Tidak ada Evolved Art
            baseIndex = 1;
            evolvedIndex = null;
        }

        const hasEvolvedArt = evolvedIndex !== null;
        const R2_CARDS = `${R2_DOMAIN}/cards`;
        const R2_COSTUMES = `${R2_DOMAIN}/costumeIcon`;

        // --- LOGIKA KOSTUM ---
        let costumeTheme = "Idol Outfit";
        let costumeImageUrl = null;

        // Cari data kostum berdasarkan rewardCostumeId di Card.json
        if (card.rewardCostumeId) {
            const costumeData = costumeMap[card.rewardCostumeId];
            if (costumeData) {
                // 1. Tentukan Nama Tema (Casual, Swimsuit, dll)
                const typeNameJp = costumeTypeMap[costumeData.costumeTypeId];
                if (typeNameJp) {
                    costumeTheme = translateText(typeNameJp, 'en'); // Default ke Inggris
                }

                // 2. Generate Link Gambar Kostum
                // Format asumsi: img_costume_[bodyAssetId].png
                // Contoh bodyAssetId: "ai-anni-00"
                costumeImageUrl = `${R2_COSTUMES}/img_cos_thumb_${costumeData.bodyAssetId}.png`;
            }
        }

        const images = {
            // Perhatikan ekstensi file: thumb/upper = .png, full = .webp
            icon: `${R2_CARDS}/img_card_thumb_${baseIndex}_${assetId}.png`,
            fullNormal: `${R2_CARDS}/img_card_full_${baseIndex}_${assetId}.webp`,
            upperNormal: `${R2_CARDS}/img_card_upper_${baseIndex}_${assetId}.png`,
            
            // Link Evolved (jika ada)
            fullEvolved: hasEvolvedArt ? `${R2_CARDS}/img_card_full_${evolvedIndex}_${assetId}.webp` : null,
            upperEvolved: hasEvolvedArt ? `${R2_CARDS}/img_card_upper_${evolvedIndex}_${assetId}.png` : null,
            
            costume: costumeImageUrl
        };

        groupedData[charName].data.push({
            uniqueId: assetId,
            initialTitle: assetId,
            title: { 
                japanese: card.name, 
                global: translateText(card.name, 'en'), 
                indo: translateText(card.name, 'id') 
            },
            description: { 
                japanese: [card.description], 
                global: [translateText(card.description, 'en')], 
                indo: [translateText(card.description, 'id')] 
            },
            releaseDate: formattedDate,
            category: card.initialRarity === 5 ? "Nonlimited" : "General",
            costumeTheme: costumeTheme,
            costumeIndex: 0,
            type: mapType(card.type),
            attribute: mapAttribute(card),
            initial: rarity,
            
            // FIX: Hapus duplikasi hasAwakening, gunakan hasil perhitungan hasEvolvedArt
            hasAwakening: hasEvolvedArt,
            
            stats: calculateStats(card),
            
            skillOne: processSkill(card.skillId1),
            skillTwo: processSkill(card.skillId2),
            skillThree: processSkill(card.skillId3),
            skillFour: processSkill(card.skillId4),
            
            yell: processYell(card.liveAbilityId, card.activityAbilityId),

            images: images
        });
    });

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