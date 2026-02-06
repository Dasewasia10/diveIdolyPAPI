import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- KONFIGURASI ---
// 1. URL R2 Base (Root Domain)
const R2_DOMAIN = "https://pub-7d42172645514f5eb523da447a6bbf58.r2.dev"; 

// 2. URL GitHub (Perhatikan Case Sensitive!)
const BASE_URL = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";

// Setup __dirname untuk ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  { jp: /効果/g, en: " Effect", id: " Efek" }
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
    const [cardsRes, skillsRes, paramsRes, rarityRes, abilityRes, efficacyRes] = await Promise.all([
      fetch(`${BASE_URL}/Card.json`),
      fetch(`${BASE_URL}/Skill.json`),
      fetch(`${BASE_URL}/CardParameter.json`),
      fetch(`${BASE_URL}/CardRarity.json`),
      fetch(`${BASE_URL}/LiveAbility.json`),
      fetch(`${BASE_URL}/SkillEfficacy.json`)
    ]);

    // Cek status response sebelum parse
    if (!cardsRes.ok) throw new Error(`Gagal fetch Card.json: ${cardsRes.statusText}`);

    const cardsRaw = await cardsRes.json();
    const skillsRaw = await skillsRes.json();
    const paramsRaw = await paramsRes.json();
    const rarityRaw = await rarityRes.json();
    const abilitiesRaw = await abilityRes.json();
    const efficacyRaw = await efficacyRes.json();

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

    const efficacyMap = {};
    efficacyRaw.forEach(e => { efficacyMap[e.id] = e; });

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

    // --- PROSES SKILL ---
    const processSkill = (skillId) => {
      if (!skillId) return undefined;
      const skillData = skillsRaw.find(s => s.id === skillId);
      if (!skillData) return undefined;
      const levelData = skillData.levels[skillData.levels.length - 1];
      if (!levelData) return undefined;

      const typeSkill = mapSkillType(skillData.categoryType);

      // Gunakan assetId untuk icon skill agar unik
      // FIX: Menambahkan folder /iconSkillYell/
      const iconUrl = `${R2_DOMAIN}/iconSkillYell/img_skill_icon_${skillData.assetId}.png`;

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
            color: typeSkill === "SP" ? "rainbow" : (typeSkill === "P" ? "yellow" : "blue")
        }
      };
    };

    const processYell = (liveAbilityId) => {
      if (!liveAbilityId) return undefined;
      const abilityData = abilityMap[liveAbilityId];
      if (!abilityData) return undefined;
      const levelData = abilityData.levels[abilityData.levels.length - 1];
      const desc = levelData ? levelData.description : abilityData.description;
      
      // FIX: Menambahkan folder /iconSkillYell/
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
             initialImage: `${R2_DOMAIN}/iconSkillYell/img_yell_icon_${abilityData.id}.png`
        }
      };
    };

    const groupedData = {};

    cardsRaw.forEach(card => {
        if (card.initialRarity < 2) return; 

        const charName = charIdToName[card.characterId] || "Other";
        if (!groupedData[charName]) groupedData[charName] = { name: charName, data: [] };

        const dateObj = new Date(parseInt(card.releaseDate));
        const formattedDate = !isNaN(dateObj) ? dateObj.toISOString().split('T')[0] : "1970-01-01";

        const assetId = card.assetId;
        const rarity = card.initialRarity;
        
        // Logika Link Card / Evolved
        const isLinkCard = assetId.includes("link") && card.skillId4 !== "";
        const hasEvolvedArt = (rarity === 3 || rarity === 4) || (rarity === 5 && isLinkCard);

        // FIX: Folder cards (asumsi gambar kartu ada di /cards/)
        const R2_CARDS = `${R2_DOMAIN}/cards`;

        const images = {
            icon: `${R2_CARDS}/img_card_thumb_1_${assetId}.png`,
            fullNormal: `${R2_CARDS}/img_card_full_1_${assetId}.png`,
            upperNormal: `${R2_CARDS}/img_card_upper_1_${assetId}.png`,
            
            fullEvolved: hasEvolvedArt ? `${R2_CARDS}/img_card_full_2_${assetId}.png` : null,
            upperEvolved: hasEvolvedArt ? `${R2_CARDS}/img_card_upper_2_${assetId}.png` : null
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
            costumeTheme: "Idol Outfit",
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
            yell: processYell(card.liveAbilityId),

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