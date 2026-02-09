import fs from "fs";
import path from "path";
import https from "https";
import zlib from "zlib";
import { fileURLToPath } from "url";

// --- KONFIGURASI ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://raw.githubusercontent.com/MalitsPlus/ipr-master-diff/main";
const OUTPUT_DIR = path.join(__dirname, "../data/messages");
const R2_DOMAIN = "https://api.diveidolypapi.my.id";

// --- MAPPING DATA ---
const charIdToName = {
  "char-mna": "Mana Nagase", "char-ktn": "Kotono Nagase", "char-skr": "Sakura Kawasaki",
  "char-rei": "Rei Ichinose", "char-ngs": "Nagisa Ibuki", "char-hrk": "Haruko Saeki",
  "char-ski": "Saki Shiraishi", "char-suz": "Suzu Narumiya", "char-mei": "Mei Hayasaka",
  "char-szk": "Shizuku Hyodo", "char-rui": "Rui Tendo", "char-yu": "Yu Suzumura",
  "char-smr": "Sumire Okuyama", "char-rio": "Rio Kanzaki", "char-aoi": "Aoi Igawa",
  "char-ai": "Ai Komiyama", "char-kkr": "Kokoro Akazaki", "char-chs": "Chisa Shiraishi",
  "char-mhk": "Miho", "char-kan": "Kana", "char-kor": "Fran", 
  "char-cca": "Cocoa", "char-chk": "Chika", "char-chn": "Chino", 
  "char-rik": "Riko", "char-stm": "Satomi Hashimoto", "char-yo": "Yo", 
};

// --- FUNGSI FETCH ---
const fetchData = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchData(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      let stream = res;
      if (res.headers["content-encoding"] === "gzip") stream = res.pipe(zlib.createGunzip());
      else if (res.headers["content-encoding"] === "deflate") stream = res.pipe(zlib.createInflate());

      let data = "";
      stream.on("data", (chunk) => (data += chunk));
      stream.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
      stream.on("error", reject);
    }).on("error", reject);
  });
};

// --- HELPER: Generate Icon URL ---
const getCharacterIconUrl = (characterId) => {
  if (!characterId) return `${R2_DOMAIN}/assets/icon/icon_manager.png`;
  
  // 1. Ambil nama penuh dari mapping
  const fullName = charIdToName[characterId];
  
  // 2. Ambil kata pertama (FirstName) dan lowercase
  let formattedName = "";
  if (fullName) {
    formattedName = fullName.split(" ")[0].toLowerCase();
  } else {
    // Fallback jika ID tidak ada di mapping (misal karakter baru/NPC)
    formattedName = characterId.replace("char-", "");
  }

  // 3. Return URL
  return `${R2_DOMAIN}/iconCharacter/chara-${formattedName}.png`;
};

// --- HELPER: Generate Speaker Name ---
const getSpeakerName = (characterId) => {
    if (!characterId) return "Manager";
    const fullName = charIdToName[characterId];
    if (fullName) {
        // Ambil kata pertama saja, biarkan huruf besar (Mana, Satomi, dll)
        return fullName.split(" ")[0]; 
    }
    return characterId; // Fallback
};

// --- HELPER: Group Icon ---
const getGroupIconUrl = (groupId) => {
  if (!groupId) return null;
  const suffix = groupId.replace("message_group_", "");
  return `${R2_DOMAIN}/iconMessageGroup/img_message_icon_${suffix}.png`;
};

// --- FUNGSI UTAMA ---
const syncMessages = async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const detailDir = path.join(OUTPUT_DIR, "detail");
  if (!fs.existsSync(detailDir)) fs.mkdirSync(detailDir, { recursive: true });

  console.log("Fetching data from MalitsPlus...");

  try {
    const [rawGroups, rawMessages] = await Promise.all([
      fetchData(`${BASE_URL}/MessageGroup.json`),
      fetchData(`${BASE_URL}/Message.json`)
    ]);

    console.log(`Loaded ${rawGroups.length} Groups and ${rawMessages.length} Messages.`);

    // Grouping Messages
    const messagesByGroupId = {};
    rawMessages.forEach((msg) => {
      const groupId = msg.messageGroupId;
      if (!groupId) return;
      if (!messagesByGroupId[groupId]) {
        messagesByGroupId[groupId] = [];
      }
      messagesByGroupId[groupId].push(msg);
    });

    const indexData = [];
    const sortedGroups = rawGroups.sort((a, b) => (a.sort_id || 0) - (b.sort_id || 0));

    let processedCount = 0;

    sortedGroups.forEach((group) => {
      const groupMessages = messagesByGroupId[group.id];
      if (!groupMessages || groupMessages.length === 0) return;

      processedCount++;

      // A. Index Data
      const groupPayload = {
        id: group.id,
        title: group.name,
        groupIcon: getGroupIconUrl(group.id),
        characterIds: group.character_ids || [], 
        messages: groupMessages.map((msg) => ({
          id: msg.id,
          title: msg.name,
          type: msg.type,
          unlockConditionId: msg.unlockConditionId
        })),
      };

      indexData.push(groupPayload);

      // B. Detail Data
      groupMessages.forEach((msg) => {
        const rawDetails = msg.details || [];

        const detailPayload = {
          id: msg.id,
          groupId: group.id,
          name: msg.name,
          characterId: msg.characterId,
          
          details: rawDetails.map((d) => {
            const isPlayer = d.characterId === "" || !d.characterId;
            
            // Logic Nama Speaker Baru
            let displayName = "Unknown";
            if (isPlayer) {
                displayName = "Manager";
            } else if (d.speakerName) {
                displayName = d.speakerName; // Jika ada override di data
            } else {
                displayName = getSpeakerName(d.characterId); // Gunakan mapping baru
            }

            return {
              id: d.messageDetailId,
              speaker: {
                isPlayer: isPlayer,
                characterId: d.characterId || "manager",
                name: displayName, // Properti nama untuk ditampilkan di UI
                icon: isPlayer ? null : getCharacterIconUrl(d.characterId) // Icon url logic baru
              },
              text: d.text || d.choiceText,
              isChoice: !!d.choiceText,
              stamp: d.stampAssetId ? `${R2_DOMAIN}/stampChat/stamp_${d.stampAssetId}.webp` : null,
              image: d.imageAssetId ? `${R2_DOMAIN}/messagePictures/img_message_picture_${d.imageAssetId}.png` : null,
              nextIds: d.nextMessageDetailIds || [],
              delay: d.delayMinutes || 0
            };
          })
        };

        fs.writeFileSync(
          path.join(detailDir, `${msg.id}.json`),
          JSON.stringify(detailPayload, null, 2)
        );
      });
    });

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "index.json"),
      JSON.stringify(indexData, null, 2)
    );

    console.log(`[SUCCESS] Generated ${processedCount} Message Groups.`);
    console.log(`[SUCCESS] Data saved to ${OUTPUT_DIR}`);

  } catch (error) {
    console.error("[ERROR]", error);
  }
};

syncMessages();