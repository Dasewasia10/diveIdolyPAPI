import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Arahkan ke folder lokal di mana kamu menyimpan gambar diary (salah satu bahasa aja, kan namanya sama)
// Contoh: folder 'temp_diary_images' di root project
const DIARY_DIR = path.join(__dirname, '../temp_diary_images/'); 
const OUTPUT_FILE = path.join(__dirname, '../data/diaryMana/diaryMana.json');

function main() {
    try {
        // Cek apakah folder ada
        if (!fs.existsSync(DIARY_DIR)) {
            console.error("❌ Folder gambar tidak ditemukan. Harap buat folder 'temp_diary_images' dan isi dengan gambar diary (versi JP/Global salah satu saja) untuk digenerate.");
            return;
        }

        const files = fs.readdirSync(DIARY_DIR);
        const diaryEntries = [];

        // Regex untuk menangkap Tanggal: img_ui_diary_16-06-01.png
        // Group 1: Tahun (16), Group 2: Bulan (06), Group 3: Tanggal (01)
        const regex = /img_ui_diary_(\d{2})-(\d{2})-(\d{2})\.png/;

        files.forEach(file => {
            const match = file.match(regex);
            if (match) {
                const yearShort = match[1]; // 16
                const month = match[2];     // 06
                const day = match[3];       // 01
                
                // Konversi ke format Date Object biar bisa disort
                // Asumsi 20xx
                const fullYear = `20${yearShort}`;
                const dateString = `${fullYear}-${month}-${day}`;

                diaryEntries.push({
                    filename: file,
                    date: dateString, // "2016-06-01"
                    displayDate: `${day}/${month}/${fullYear}`,
                    year: fullYear,
                    month: month,
                    day: day
                });
            }
        });

        // Sort berdasarkan tanggal (Ascending: Debut -> Akhir)
        diaryEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Pastikan folder output ada
        const outputDir = path.dirname(OUTPUT_FILE);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(diaryEntries, null, 2));
        console.log(`✅ Berhasil generate ${diaryEntries.length} entri diary ke public/data/diaryManifest.json`);

    } catch (error) {
        console.error("Error:", error);
    }
}

main();