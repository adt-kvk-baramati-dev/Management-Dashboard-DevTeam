/**
 * Generates approximate taluka boundary GeoJSON for each Maharashtra district
 * by subdividing the district polygon into a grid of taluka cells.
 * Run: node scripts/generate-taluka-geojson.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Complete district → talukas mapping
const DISTRICT_TALUKAS = {
  "Greater Bombay": [],
  "Thane": ["Thane","Kalyan","Murbad","Bhiwandi","Shahapur","Ulhasnagar","Ambarnath"],
  "Palghar": ["Palghar","Vasai","Dahanu","Talasari","Jawhar","Mokhada","Vada","Vikramgad"],
  "Raigarh": ["Alibaug","Pen","Murud","Panvel","Uran","Karjat","Khalapur","Mangaon","Tala","Roha","Sudhagad","Mahad","Poladpur","Shrivardhan","Mhasala"],
  "Ratnagiri": ["Ratnagiri","Sangameshwar","Lanja","Rajapur","Chiplun","Guhagar","Dapoli","Mandangad","Khed"],
  "Sindhudurg": ["Kankavli","Vaibhavwadi","Devgad","Malwan","Sawantwadi","Kudal","Vengurla","Dodamarg"],
  "Pune": ["Pune City","Haveli","Khed","Junnar","Ambegaon","Shirur","Maval","Mulshi","Velhe","Bhor","Purandar","Baramati","Indapur","Daund"],
  "Satara": ["Satara","Wai","Khandala","Koregaon","Phaltan","Khatav","Man","Karad","Patan","Jaoli","Mahabaleshwar"],
  "Sangli": ["Miraj","Tasgaon","Kavathe-Mahankal","Walwa","Shirala","Khanapur","Atpadi","Jat","Kadegaon","Palus"],
  "Kolhapur": ["Karveer","Kagal","Panhala","Shahuwadi","Hatkanangale","Shirol","Radhanagari","Gaganbawada","Bhudargad","Ajara","Gadhinglaj","Chandgad"],
  "Solapur": ["Solapur North","Solapur South","Akkalkot","Barshi","Mangalwedhe","Pandharpur","Sangola","Madha","Karmala","Mohol","Malshiras"],
  "Nashik": ["Nashik","Igatpuri","Dindori","Peth","Trimbakeshwar","Kalwan","Deola","Surgana","Baglan","Malegaon","Nandgaon","Chandwad","Niphad","Sinnar","Yeola"],
  "Ahmednagar": ["Ahmednagar","Rahuri","Nevasa","Shrirampur","Sangamner","Akole","Kopargaon","Rahata","Pathardi","Shevgaon","Parner","Karjat","Shrigonda","Jamkhed"],
  "Dhule": ["Dhule","Sakri","Sindkheda","Shirpur"],
  "Nandurbar": ["Nandurbar","Navapur","Shahada","Talode","Akkalkuwa","Dhadgaon"],
  "Jalgaon": ["Jalgaon","Jamner","Erandol","Dharangaon","Bhusawal","Raver","Muktainagar","Bodwad","Yawal","Amalner","Parola","Chopda","Pachora","Bhadgaon","Chalisgaon"],
  "Aurangabad": ["Aurangabad","Paithan","Gangapur","Vaijapur","Kannad","Khuldabad","Sillod","Soegaon","Phulambri"],
  "Jalna": ["Jalna","Badnapur","Bhokardan","Jafrabad","Partur","Ambad","Ghansawangi","Mantha"],
  "Parbhani": ["Parbhani","Jintur","Selu","Manwath","Pathri","Sonpeth","Gangakhed","Palam","Purna"],
  "Hingoli": ["Hingoli","Sengaon","Kalamnuri","Basmath","Aundha Nagnath"],
  "Bid": ["Beed","Georai","Majalgaon","Dharur","Parli","Ambejogai","Kaij","Ashti","Patoda","Shirur Kasar","Wadwani"],
  "Latur": ["Latur","Renapur","Ahmedpur","Jalkot","Chakur","Shirur Anantpal","Ausa","Nilanga","Udgir","Deoni"],
  "Osmanabad": ["Osmanabad","Tuljapur","Omerga","Lohara","Kalamb","Bhum","Paranda","Washi"],
  "Nanded": ["Nanded","Mudkhed","Ardhapur","Bhokar","Umri","Kandhar","Loha","Naigaon","Biloli","Dharmabad","Mukhed","Deglur","Hadgaon","Himayatnagar","Kinwat","Mahur"],
  "Amravati": ["Amravati","Bhatkuli","Nandgaon Khandeshwar","Chandurbazar","Morshi","Warud","Achalpur","Chandur Railway","Dhamangaon Railway","Tiosa","Daryapur","Anjangaon Surji","Dharni","Chikhaldara"],
  "Akola": ["Akola","Akot","Telhara","Balapur","Patur","Murtajapur","Barshitakli"],
  "Washim": ["Washim","Risod","Malegaon","Mangrulpir","Karanja","Manora"],
  "Buldana": ["Buldhana","Chikhli","Deulgaon Raja","Mehkar","Sindkhed Raja","Lonar","Khamgaon","Shegaon","Malkapur","Motala","Nandura","Jalgaon Jamod","Sangrampur"],
  "Yavatmal": ["Yavatmal","Arni","Babhulgaon","Kalamb","Darwha","Digras","Ner","Pusad","Umarkhed","Mahagaon","Kelapur","Ralegaon","Ghatanji","Wani","Maregaon","Zari Jamani"],
  "Nagpur": ["Nagpur Urban","Nagpur Rural","Kamptee","Hingna","Katol","Narkhed","Savner","Kalameshwar","Ramtek","Mouda","Parseoni","Umred","Kuhi","Bhiwapur"],
  "Wardha": ["Wardha","Deoli","Seloo","Arvi","Ashti","Karanja","Hinganghat","Samudrapur"],
  "Bhandara": ["Bhandara","Tumsar","Pauni","Mohadi","Sakoli","Lakhani","Lakhandur"],
  "Gondiya": ["Gondia","Goregaon","Tirora","Arjuni-Morgaon","Sadak-Arjuni","Salekasa","Amgaon","Deori"],
  "Chandrapur": ["Chandrapur","Saoli","Mul","Ballarpur","Pombhurna","Gondpimpri","Warora","Chimur","Bhadravati","Bramhapuri","Nagbhid","Sindewahi","Rajura","Korpana","Jiwati"],
  "Garhchiroli": ["Gadchiroli","Dhanora","Chamorshi","Mulchera","Desaiganj","Armori","Kurkheda","Korchi","Aheri","Etapalli","Bhamragad","Sironcha"],
};

const districtGeoJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/geojson/districts/maharashtra.json"), "utf8")
);

// For each district, subdivide its bounding box into a grid for talukas
function getBbox(feature) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const coords = feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
  
  for (const ring of coords) {
    const pts = Array.isArray(ring[0]) ? ring : [ring];
    for (const pt of pts) {
      if (Array.isArray(pt) && pt.length >= 2) {
        minX = Math.min(minX, pt[0]);
        minY = Math.min(minY, pt[1]);
        maxX = Math.max(maxX, pt[0]);
        maxY = Math.max(maxY, pt[1]);
      }
    }
  }
  return [minX, minY, maxX, maxY];
}

function makeGrid(bbox, talukas) {
  const [minX, minY, maxX, maxY] = bbox;
  const n = talukas.length;
  if (n === 0) return [];
  
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cellW = (maxX - minX) / cols;
  const cellH = (maxY - minY) / rows;
  
  return talukas.map((name, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x0 = minX + col * cellW;
    const y0 = minY + row * cellH;
    const x1 = x0 + cellW;
    const y1 = y0 + cellH;
    
    return {
      type: "Feature",
      properties: { taluka: name, district: "" },
      geometry: {
        type: "Polygon",
        coordinates: [[[x0,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0]]]
      }
    };
  });
}

const outDir = path.join(__dirname, "../public/geojson/talukas/maharashtra");
fs.mkdirSync(outDir, { recursive: true });

for (const feature of districtGeoJson.features) {
  const districtName = feature.properties.NAME_2;
  const talukas = DISTRICT_TALUKAS[districtName] || [];
  
  if (talukas.length === 0) {
    console.log(`Skipping ${districtName} (no talukas)`);
    continue;
  }
  
  const bbox = getBbox(feature);
  const features = makeGrid(bbox, talukas).map(f => ({
    ...f,
    properties: { ...f.properties, district: districtName }
  }));
  
  const slug = districtName.toLowerCase().replace(/\s+/g, "-");
  const outPath = path.join(outDir, `${slug}.json`);
  
  fs.writeFileSync(outPath, JSON.stringify({
    type: "FeatureCollection",
    features
  }));
  
  console.log(`Generated ${districtName}: ${features.length} talukas → ${outPath}`);
}

console.log("Done!");
