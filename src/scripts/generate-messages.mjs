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
  if (!characterId) return `${R2_DOMAIN}/iconCharacter/chara-avatar.png`;
  const formattedId = characterId.replace("char-", "chara-");
  return `${R2_DOMAIN}/iconCharacter/${formattedId}.png`;
};

// --- BARU: Helper untuk Group Icon ---
const getGroupIconUrl = (groupId) => {
  if (!groupId) return null;
  // Contoh: "message_group_ai" -> "ai"
  const suffix = groupId.replace("message_group_", "");
  // Hasil: "img_message_icon_ai.png"
  return `${R2_DOMAIN}/iconMessages/img_message_icon_${suffix}.png`;
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
    
    // Sort Group
    const sortedGroups = rawGroups.sort((a, b) => (a.sort_id || 0) - (b.sort_id || 0));

    let processedCount = 0;

    sortedGroups.forEach((group) => {
      const groupMessages = messagesByGroupId[group.id];
      if (!groupMessages || groupMessages.length === 0) return;

      processedCount++;

      // A. Payload Index (Sidebar)
      const groupPayload = {
        id: group.id,
        title: group.title,
        // BARU: Icon khusus untuk Group/DM (List Menu)
        groupIcon: getGroupIconUrl(group.id), 
        // Array characterIds tetap disimpan untuk keperluan fallback/filter
        characterIds: group.character_ids || [], 
        messages: groupMessages.map((msg) => ({
          id: msg.id,
          title: msg.name,
          type: msg.type,
          unlockConditionId: msg.unlockConditionId
        })),
      };

      indexData.push(groupPayload);

      // B. File Detail
      groupMessages.forEach((msg) => {
        const rawDetails = msg.details || [];

        const detailPayload = {
          id: msg.id,
          groupId: group.id,
          name: msg.name,
          characterId: msg.characterId,
          
          details: rawDetails.map((d) => {
            const isPlayer = d.characterId === "" || !d.characterId;
            return {
              id: d.messageDetailId,
              speaker: {
                isPlayer: isPlayer,
                characterId: d.characterId || "manager",
                icon: isPlayer ? null : getCharacterIconUrl(d.characterId)
              },
              text: d.text || d.choiceText,
              isChoice: !!d.choiceText,
              stamp: d.stampAssetId ? `${R2_DOMAIN}/stampChat/stamp_${d.stampAssetId}.webp` : null,
              image: d.imageAssetId ? `${R2_DOMAIN}/images/${d.imageAssetId}.png` : null,
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