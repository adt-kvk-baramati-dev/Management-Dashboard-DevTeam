import "dotenv/config";
import { MongoClient } from "mongodb";

const MIN_TARGET = 1000;
const MAX_TARGET = 1500;
const DEFAULT_TARGET = 1200;
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 500);
const INCLUDE_GEO = String(process.env.INCLUDE_GEO || "false").toLowerCase() === "true";

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || "kvk_portal";

if (!URI) {
  throw new Error("MONGODB_URI is required");
}

const districtGeoBounds = {
  Ahmednagar: { latMin: 18.2, latMax: 19.9, lngMin: 73.6, lngMax: 75.5 },
  Akola: { latMin: 20.2, latMax: 21.5, lngMin: 76.6, lngMax: 77.9 },
  Amravati: { latMin: 20.3, latMax: 21.8, lngMin: 76.5, lngMax: 78.3 },
  Aurangabad: { latMin: 19.2, latMax: 20.4, lngMin: 74.8, lngMax: 76.2 },
  Beed: { latMin: 18.6, latMax: 19.8, lngMin: 75.1, lngMax: 76.4 },
  Bhandara: { latMin: 20.6, latMax: 21.4, lngMin: 79.5, lngMax: 80.5 },
  Buldhana: { latMin: 19.5, latMax: 21.0, lngMin: 75.8, lngMax: 77.5 },
  Chandrapur: { latMin: 19.5, latMax: 20.8, lngMin: 78.8, lngMax: 80.3 },
  Dhule: { latMin: 20.4, latMax: 21.7, lngMin: 73.8, lngMax: 75.5 },
  Gadchiroli: { latMin: 18.7, latMax: 20.4, lngMin: 79.7, lngMax: 81.3 },
  Gondia: { latMin: 20.6, latMax: 21.7, lngMin: 79.7, lngMax: 80.7 },
  Hingoli: { latMin: 19.2, latMax: 20.0, lngMin: 76.6, lngMax: 77.6 },
  Jalgaon: { latMin: 20.6, latMax: 21.6, lngMin: 74.7, lngMax: 76.4 },
  Jalna: { latMin: 19.4, latMax: 20.5, lngMin: 75.3, lngMax: 76.8 },
  Kolhapur: { latMin: 15.6, latMax: 17.3, lngMin: 73.7, lngMax: 74.8 },
  Latur: { latMin: 17.8, latMax: 18.9, lngMin: 76.2, lngMax: 77.6 },
  MumbaiCity: { latMin: 18.85, latMax: 19.3, lngMin: 72.75, lngMax: 72.95 },
  MumbaiSuburban: { latMin: 19.0, latMax: 19.35, lngMin: 72.78, lngMax: 72.97 },
  Nagpur: { latMin: 20.5, latMax: 21.7, lngMin: 78.6, lngMax: 79.8 },
  Nanded: { latMin: 18.3, latMax: 19.6, lngMin: 76.8, lngMax: 78.3 },
  Nandurbar: { latMin: 20.9, latMax: 22.1, lngMin: 73.5, lngMax: 75.2 },
  Nashik: { latMin: 19.3, latMax: 20.9, lngMin: 73.2, lngMax: 74.8 },
  Osmanabad: { latMin: 17.6, latMax: 18.7, lngMin: 75.8, lngMax: 76.9 },
  Palghar: { latMin: 19.3, latMax: 20.4, lngMin: 72.7, lngMax: 73.8 },
  Parbhani: { latMin: 18.9, latMax: 20.0, lngMin: 76.6, lngMax: 77.8 },
  Pune: { latMin: 17.5, latMax: 19.4, lngMin: 73.3, lngMax: 75.2 },
  Raigad: { latMin: 17.9, latMax: 19.3, lngMin: 72.9, lngMax: 74.1 },
  Ratnagiri: { latMin: 16.9, latMax: 18.0, lngMin: 73.1, lngMax: 74.2 },
  Sangli: { latMin: 16.7, latMax: 17.7, lngMin: 73.6, lngMax: 75.1 },
  Satara: { latMin: 17.0, latMax: 18.3, lngMin: 73.4, lngMax: 74.8 },
  Sindhudurg: { latMin: 15.6, latMax: 16.7, lngMin: 73.3, lngMax: 74.2 },
  Solapur: { latMin: 17.1, latMax: 18.6, lngMin: 74.6, lngMax: 76.4 },
  Thane: { latMin: 19.1, latMax: 19.8, lngMin: 72.9, lngMax: 73.4 },
  Wardha: { latMin: 20.2, latMax: 21.4, lngMin: 77.6, lngMax: 78.8 },
  Washim: { latMin: 19.9, latMax: 20.9, lngMin: 76.8, lngMax: 77.9 },
  Yavatmal: { latMin: 19.3, latMax: 21.1, lngMin: 77.2, lngMax: 79.3 },
};

const maharashtraGeoFallback = { latMin: 15.6, latMax: 22.1, lngMin: 72.6, lngMax: 81.3 };

const districtTalukaVillageMap = {
  Ahmednagar: {
    talukas: ["Ahmednagar", "Shrirampur", "Rahata"],
    villages: ["Shendi", "Nimgaon", "Babhaleshwar", "Takli", "Pimpalgaon"],
  },
  Akola: {
    talukas: ["Akola", "Balapur", "Murtizapur"],
    villages: ["Borgaon", "Babhulgaon", "Manarkhed", "Kinhiraja", "Wadgaon"],
  },
  Amravati: {
    talukas: ["Amravati", "Daryapur", "Achalpur"],
    villages: ["Pathrot", "Kholapur", "Bhatkuli", "Nandgaon", "Asara"],
  },
  Aurangabad: {
    talukas: ["Aurangabad", "Paithan", "Sillod"],
    villages: ["Bidkin", "Daulatabad", "Bhokardan", "Waluj", "Pachod"],
  },
  Beed: {
    talukas: ["Beed", "Georai", "Majalgaon"],
    villages: ["Pangri", "Chincholi", "Nandur", "Khalapuri", "Sirsala"],
  },
  Bhandara: {
    talukas: ["Bhandara", "Tumsar", "Mohadi"],
    villages: ["Pauni", "Asgaon", "Khamari", "Tekepar", "Borgaon"],
  },
  Buldhana: {
    talukas: ["Buldhana", "Malkapur", "Khamgaon"],
    villages: ["Shegaon", "Nandura", "Sangrampur", "Dhad", "Motha"],
  },
  Chandrapur: {
    talukas: ["Chandrapur", "Warora", "Bhadravati"],
    villages: ["Mul", "Rajura", "Bembal", "Ghugus", "Ballarpur"],
  },
  Dhule: {
    talukas: ["Dhule", "Shirpur", "Sakri"],
    villages: ["Shindkheda", "Kusumba", "Avdhan", "Dhamangaon", "Arvi"],
  },
  Gadchiroli: {
    talukas: ["Gadchiroli", "Armori", "Desaiganj"],
    villages: ["Wadsa", "Chamorshi", "Mulchera", "Aheri", "Sironcha"],
  },
  Gondia: {
    talukas: ["Gondia", "Tirora", "Amgaon"],
    villages: ["Goregaon", "Salekasa", "Sadak Arjuni", "Deori", "Kati"],
  },
  Hingoli: {
    talukas: ["Hingoli", "Sengaon", "Aundha"],
    villages: ["Kalamnuri", "Basmat", "Narsi", "Jawla", "Pimpaldari"],
  },
  Jalgaon: {
    talukas: ["Jalgaon", "Bhusawal", "Chalisgaon"],
    villages: ["Pachora", "Erandol", "Parola", "Jamner", "Yawal"],
  },
  Jalna: {
    talukas: ["Jalna", "Ambad", "Partur"],
    villages: ["Badnapur", "Mantha", "Ghansawangi", "Ashti", "Watur"],
  },
  Kolhapur: {
    talukas: ["Karvir", "Hatkanangale", "Shirol"],
    villages: ["Shiroli", "Rukadi", "Ichalkaranji", "Kodoli", "Kagal"],
  },
  Latur: {
    talukas: ["Latur", "Udgir", "Ausa"],
    villages: ["Nilanga", "Chakur", "Renapur", "Deoni", "Shirur Anantpal"],
  },
  MumbaiCity: {
    talukas: ["Mumbai"],
    villages: ["Colaba", "Byculla", "Parel"],
  },
  MumbaiSuburban: {
    talukas: ["Andheri", "Borivali", "Kurla"],
    villages: ["Goregaon", "Malad", "Vile Parle", "Mulund", "Chembur"],
  },
  Nagpur: {
    talukas: ["Nagpur", "Hingna", "Katol"],
    villages: ["Kalmeshwar", "Narkhed", "Savner", "Kamptee", "Umred"],
  },
  Nanded: {
    talukas: ["Nanded", "Deglur", "Bhokar"],
    villages: ["Loha", "Mudkhed", "Hadgaon", "Kandhar", "Biloli"],
  },
  Nandurbar: {
    talukas: ["Nandurbar", "Navapur", "Shahada"],
    villages: ["Taloda", "Akkalkuwa", "Dhadgaon", "Nawapur", "Lonkheda"],
  },
  Nashik: {
    talukas: ["Nashik", "Niphad", "Sinnar"],
    villages: ["Yeola", "Pimpalgaon", "Lasalgaon", "Dindori", "Igatpuri"],
  },
  Osmanabad: {
    talukas: ["Osmanabad", "Tuljapur", "Paranda"],
    villages: ["Bhoom", "Kalamb", "Umarga", "Yedshi", "Murum"],
  },
  Palghar: {
    talukas: ["Palghar", "Dahanu", "Vasai"],
    villages: ["Boisar", "Wada", "Jawhar", "Mokhada", "Talasari"],
  },
  Parbhani: {
    talukas: ["Parbhani", "Gangakhed", "Purna"],
    villages: ["Jintur", "Sonpeth", "Pathri", "Selu", "Manwath"],
  },
  Pune: {
    talukas: ["Baramati", "Indapur", "Junnar", "Shirur", "Bhor"],
    villages: ["Hol", "Sadobachiwadi", "Someshwarnagar", "Malegaon", "Nira", "Narayangaon"],
  },
  Raigad: {
    talukas: ["Alibag", "Panvel", "Mangaon"],
    villages: ["Pen", "Uran", "Khopoli", "Mahad", "Roha"],
  },
  Ratnagiri: {
    talukas: ["Ratnagiri", "Chiplun", "Dapoli"],
    villages: ["Lanja", "Rajapur", "Guhagar", "Sangameshwar", "Khed"],
  },
  Sangli: {
    talukas: ["Miraj", "Tasgaon", "Kadegaon"],
    villages: ["Vita", "Kavathe Mahankal", "Jat", "Atpadi", "Islampur"],
  },
  Satara: {
    talukas: ["Satara", "Khandala", "Karad"],
    villages: ["Wathar Bk", "Phaltan", "Wai", "Koregaon", "Patan"],
  },
  Sindhudurg: {
    talukas: ["Kankavli", "Kudal", "Sawantwadi"],
    villages: ["Malvan", "Vengurla", "Devgad", "Dodamarg", "Vaibhavwadi"],
  },
  Solapur: {
    talukas: ["Solapur North", "Pandharpur", "Mohol"],
    villages: ["Akkalkot", "Mangalwedha", "Barshi", "Madha", "Karmala"],
  },
  Thane: {
    talukas: ["Thane", "Bhiwandi", "Kalyan"],
    villages: ["Murbad", "Shahapur", "Dombivli", "Ulhasnagar", "Ambernath"],
  },
  Wardha: {
    talukas: ["Wardha", "Hinganghat", "Arvi"],
    villages: ["Deoli", "Pulgaon", "Seloo", "Karanja", "Ashti"],
  },
  Washim: {
    talukas: ["Washim", "Mangrulpir", "Karanja"],
    villages: ["Risod", "Malegaon", "Manora", "Ansing", "Patur"],
  },
  Yavatmal: {
    talukas: ["Yavatmal", "Pusad", "Darwha"],
    villages: ["Wani", "Umarkhed", "Digras", "Ner", "Ralegaon"],
  },
};

const firstNames = [
  "Aarav", "Arjun", "Rohit", "Ganesh", "Suresh", "Mahesh", "Vishal", "Aniket", "Prakash", "Rajendra",
  "Shankar", "Ramesh", "Dnyaneshwar", "Sunil", "Nitin", "Bhaskar", "Sanjay", "Kailas", "Ajinkya", "Sachin",
  "Vijay", "Bharat", "Swapnil", "Pravin", "Datta", "Laxman", "Abhijit", "Amol", "Harshal", "Yogesh",
  "Meera", "Sunita", "Kavita", "Asha", "Pooja", "Vaishali", "Savita", "Madhuri", "Shital", "Komal",
  "Bhagyashree", "Priyanka", "Anita", "Jyoti", "Archana", "Rani", "Sangeeta", "Deepa", "Sarika", "Manisha",
];

const middleNames = [
  "Anandrao", "Vinayak", "Baburao", "Shankarrao", "Balasaheb", "Dattatray", "Shrikant", "Govindrao",
  "Raghunath", "Eknath", "Kashinath", "Pandurang", "Namdeo", "Maruti", "Balkrishna", "Ravindra", "Sopan",
  "Tukaram", "Bapurao", "Narayan", "Ashokrao", "Rangnath", "Subhash", "Jagannath", "Shridhar",
];

const surnames = [
  "Shinde", "Patil", "Jadhav", "Pawar", "Gaikwad", "Chavan", "More", "Deshmukh", "Kadam", "Bhosale",
  "Suryawanshi", "Mane", "Mohite", "Jagtap", "Salunkhe", "Dhumal", "Ghorpade", "Waghmare", "Holkar", "Nalawade",
  "Shitole", "Kale", "Landge", "Khot", "Bharambe", "Chougule", "Kokate", "Inamdar", "Khairnar", "Raut",
];

const cropPool = [
  "Sugarcane", "Cotton", "Wheat", "Rice", "Soybean", "Bajra", "Jowar", "Tur", "Maize", "Onion", "Grapes", "Pomegranate",
  "CO 86032", "CO 0265", "MS 10001", "VSI 12121", "Phule Samruddhi",
];

const seasonPool = ["Kharif", "Rabi", "Summer", "Adsali", "Aadsali"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDateInRange(startMs, endMs) {
  return new Date(randomInt(startMs, endMs));
}

function formatDateYYYYMMDD(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function randomPhone() {
  const first = String(randomInt(6, 9));
  let rest = "";
  for (let i = 0; i < 9; i += 1) rest += String(randomInt(0, 9));
  return first + rest;
}

function randomName() {
  return `${randomPick(firstNames)} ${randomPick(middleNames)} ${randomPick(surnames)}`;
}

function inferSchema(docs) {
  const fieldMeta = {};
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc)) {
      if (!fieldMeta[key]) {
        fieldMeta[key] = { count: 0, types: new Set() };
      }
      fieldMeta[key].count += 1;
      if (value === null) {
        fieldMeta[key].types.add("null");
      } else if (Array.isArray(value)) {
        fieldMeta[key].types.add("array");
      } else if (value instanceof Date) {
        fieldMeta[key].types.add("date");
      } else {
        fieldMeta[key].types.add(typeof value);
      }
    }
  }

  const normalized = {};
  for (const [k, v] of Object.entries(fieldMeta)) {
    normalized[k] = {
      count: v.count,
      types: [...v.types],
    };
  }
  return normalized;
}

function getNumericPrn(prn) {
  const val = String(prn ?? "").trim();
  const digits = val.match(/\d+/g);
  if (!digits) return null;
  return Number(digits.join(""));
}

function buildPrnGenerator(existingDocs) {
  const existing = new Set(existingDocs.map((d) => String(d.prn_no ?? d.PRN ?? "").trim()).filter(Boolean));
  let max = 1000;
  for (const d of existingDocs) {
    const n = getNumericPrn(d.prn_no ?? d.PRN);
    if (Number.isFinite(n) && n > max) max = n;
  }

  return () => {
    let candidate;
    do {
      max += 1;
      candidate = String(max);
    } while (existing.has(candidate));
    existing.add(candidate);
    return candidate;
  };
}

function maybeGeo(district) {
  const bounds = districtGeoBounds[district] || maharashtraGeoFallback;
  const lat = Number((Math.random() * (bounds.latMax - bounds.latMin) + bounds.latMin).toFixed(6));
  const lng = Number((Math.random() * (bounds.lngMax - bounds.lngMin) + bounds.lngMin).toFixed(6));
  return { lat, lng };
}

function chooseDistrictSequence(targetCount) {
  const districts = Object.keys(districtTalukaVillageMap);
  const seeded = [...districts];
  while (seeded.length < targetCount) {
    seeded.push(randomPick(districts));
  }

  for (let i = seeded.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [seeded[i], seeded[j]] = [seeded[j], seeded[i]];
  }

  return seeded;
}

function buildDocTemplate(existingDocs) {
  let template = existingDocs[0] || {};
  for (const doc of existingDocs) {
    if (Object.keys(doc).length > Object.keys(template).length) {
      template = doc;
    }
  }
  const copy = { ...template };
  delete copy._id;
  return copy;
}

function generateRecords({ schema, template, targetCount, existingDocs }) {
  const nextPrn = buildPrnGenerator(existingDocs);
  const districtSequence = chooseDistrictSequence(targetCount);
  const usedFingerprints = new Set();
  const records = [];

  const now = Date.now();
  const past = now - 1000 * 60 * 60 * 24 * 730;

  let i = 0;
  while (records.length < targetCount) {
    const district = districtSequence[records.length % districtSequence.length];
    const zone = districtTalukaVillageMap[district];
    const taluka = randomPick(zone.talukas);
    const village = randomPick(zone.villages);

    const farmerName = randomName();
    const phone = randomPhone();
    const prn = nextPrn();

    const fingerprint = `${farmerName}|${phone}|${district}|${taluka}|${village}`;
    if (usedFingerprints.has(fingerprint)) {
      i += 1;
      continue;
    }
    usedFingerprints.add(fingerprint);

    const createdAt = randomDateInRange(past, now - 1000 * 60 * 60 * 24);
    const updatedAt = randomDateInRange(createdAt.getTime(), now);
    const crop = randomPick(cropPool);
    const season = randomPick(seasonPool);
    const transDate = randomDateInRange(now - 1000 * 60 * 60 * 24 * 365, now - 1000 * 60 * 60 * 24 * 30);

    const doc = { ...template };

    if ("prn_no" in schema || "prn_no" in doc) doc.prn_no = prn;
    if ("PRN" in schema || "PRN" in doc) doc.PRN = prn;

    if ("farmer_name" in schema || "farmer_name" in doc) doc.farmer_name = farmerName;
    if ("name" in schema || "name" in doc) doc.name = farmerName;

    if ("mobile" in schema || "mobile" in doc) doc.mobile = phone;
    if ("phone" in schema || "phone" in doc) doc.phone = phone;

    if ("district" in schema || "district" in doc) doc.district = district;
    if ("taluka" in schema || "taluka" in doc) doc.taluka = taluka;
    if ("village" in schema || "village" in doc) doc.village = village;
    if ("state" in schema || "state" in doc) doc.state = "Maharashtra";

    if ("role" in schema || "role" in doc) doc.role = "farmer";
    if ("created_by" in schema || "created_by" in doc) doc.created_by = "dummy-seed-script";

    if ("crop" in schema || "crop" in doc) doc.crop = crop;
    if ("complaint_type" in schema || "complaint_type" in doc) doc.complaint_type = crop;
    if ("variety_of_cultivation" in schema || "variety_of_cultivation" in doc) doc.variety_of_cultivation = crop;

    if ("farmSize" in schema || "farmSize" in doc) doc.farmSize = `${randomInt(1, 12)} acre`;
    if ("season" in schema || "season" in doc) doc.season = season;
    if ("transplanting_date" in schema || "transplanting_date" in doc) doc.transplanting_date = formatDateYYYYMMDD(transDate);

    if ("address" in schema || "address" in doc) {
      const pincode = randomInt(400001, 444999);
      doc.address = `At-${village}, Tal-${taluka}, Dist-${district}, Maharashtra ${pincode}`;
    }

    if ("import_sheet" in schema || "import_sheet" in doc) doc.import_sheet = "Sheet1";
    if ("import_source" in schema || "import_source" in doc) doc.import_source = "dummy_bulk_seed";

    if ("created_at" in schema || "created_at" in doc) doc.created_at = createdAt;
    if ("updated_at" in schema || "updated_at" in doc) doc.updated_at = updatedAt;
    if ("createdAt" in schema || "createdAt" in doc) doc.createdAt = createdAt;
    if ("updatedAt" in schema || "updatedAt" in doc) doc.updatedAt = updatedAt;

    if (INCLUDE_GEO) {
      const { lat, lng } = maybeGeo(district);
      doc.lat = lat;
      doc.lng = lng;
    }

    delete doc._id;

    records.push(doc);
    i += 1;
  }

  return records;
}

async function main() {
  const argCount = Number(process.argv[2]);
  const targetCount = Number.isFinite(argCount)
    ? Math.max(MIN_TARGET, Math.min(MAX_TARGET, argCount))
    : DEFAULT_TARGET;

  const client = new MongoClient(URI, { maxPoolSize: 20 });
  await client.connect();

  try {
    const db = client.db(DB_NAME);
    const allCollections = (await db.listCollections().toArray()).map((c) => c.name);
    const collectionName =
      allCollections.find((name) => name === "Farmers") ||
      allCollections.find((name) => name.toLowerCase() === "farmers") ||
      "Farmers";

    const collection = db.collection(collectionName);
    const existingDocs = await collection.find({}).toArray();

    if (existingDocs.length === 0) {
      throw new Error(`Collection ${collectionName} has no records to infer schema from.`);
    }

    const schema = inferSchema(existingDocs);
    const template = buildDocTemplate(existingDocs);

    const records = generateRecords({
      schema,
      template,
      targetCount,
      existingDocs,
    });

    let insertedTotal = 0;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) continue;
      const result = await collection.insertMany(batch, { ordered: false });
      insertedTotal += result.insertedCount;
    }

    const finalCount = await collection.countDocuments();

    console.log(
      JSON.stringify(
        {
          ok: true,
          db: DB_NAME,
          collection: collectionName,
          existingCount: existingDocs.length,
          requestedInsertCount: targetCount,
          insertedCount: insertedTotal,
          finalCount,
          includeGeo: INCLUDE_GEO,
          schemaFields: Object.keys(schema),
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error?.message || "Unknown error",
        stack: error?.stack,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
