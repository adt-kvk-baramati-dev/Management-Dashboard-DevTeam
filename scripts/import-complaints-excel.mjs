import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import * as XLSX from "xlsx";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const STATUS_WEIGHTS = [
  { value: "Pending", weight: 0.58 },
  { value: "In Progress", weight: 0.27 },
  { value: "Solved", weight: 0.15 },
];

const DOMAIN_TO_TYPE = [
  { keys: ["irrigation", "water", "drip", "sprinkler", "canal"], type: "Irrigation Management" },
  { keys: ["pest", "insect", "fungus", "disease", "termite"], type: "Insecticide & Pest Control" },
  { keys: ["fertilizer", "nutrient", "npk", "urea", "manure"], type: "Fertilizer Management" },
  { keys: ["soil", "ph", "micronutrient", "salinity"], type: "Soil Testing" },
  { keys: ["map", "satellite", "ndvi", "remote"], type: "Map My Crop" },
  { keys: ["crop", "fasal", "yield", "growth", "variety"], type: "Fasal (Crop Management)" },
  { keys: ["advisory", "agriculture", "krushik", "farming", "cultivation"], type: "Krushik Advisory" },
  { keys: ["training", "awareness", "outreach", "session", "camp"], type: "Farmer Outreach" },
  { keys: ["machine", "machinery", "tractor", "harvester", "implement"], type: "Other" },
];

const DESCRIPTION_TEMPLATES = {
  "Krushik Advisory": [
    "Farmer requested advisory for crop stage planning after uneven growth observed in part of the plot.",
    "Need expert guidance on improving tillering and maintaining crop vigor during current weather swings.",
    "Farmer asked for schedule support on irrigation, nutrient dose, and canopy management for better yield.",
  ],
  "Fasal (Crop Management)": [
    "Crop stand is patchy and farmer needs a field-level intervention plan for recovery and uniform growth.",
    "Reported delayed growth and requested stage-wise crop management advice for the next three weeks.",
    "Farmer seeks practical recommendations for improving yield potential under current field conditions.",
  ],
  "Map My Crop": [
    "Requested map-based field interpretation to validate stress zones and prioritize corrective actions.",
    "Farmer asked for satellite map review to compare low-vigor and healthy sections in the same field.",
    "Need support on map layers to identify underperforming patches and plan targeted intervention.",
  ],
  "Fertilizer Management": [
    "Reported leaf yellowing and wants dosage correction for nutrient balance in standing crop.",
    "Farmer needs recommendation for split fertilizer application to reduce nutrient loss and improve uptake.",
    "Requested guidance on correcting nutrient deficiency symptoms observed after recent irrigation cycle.",
  ],
  "Insecticide & Pest Control": [
    "Pest incidence increased over the last week and farmer needs immediate control recommendation.",
    "Observed leaf damage and requested integrated pest management plan for current infestation.",
    "Farmer reported recurring pest attack and needs preventive plus curative spray schedule.",
  ],
  "Soil Testing": [
    "Farmer requested soil testing support to verify pH and nutrient profile before next application.",
    "Need interpretation of soil health concerns and suitable amendment advice for the current field.",
    "Reported poor response to inputs; requested soil sample-based recommendation for better productivity.",
  ],
  "Irrigation Management": [
    "Water distribution is uneven; farmer needs irrigation scheduling guidance for better moisture control.",
    "Requested support on irrigation interval planning due to visible moisture stress in parts of plot.",
    "Farmer reported low pressure and seeks advice on efficient irrigation management for current crop stage.",
  ],
  "Farmer Outreach": [
    "Farmer requested inclusion in upcoming awareness session related to current field challenge.",
    "Need follow-up outreach support to explain recommended practices and ensure adoption.",
    "Community-level issue reported; farmer asked for a local session with practical demonstrations.",
  ],
  Other: [
    "Farmer reported a field issue requiring manual verification and specialist follow-up.",
    "Complaint recorded under miscellaneous category pending detailed technical assessment.",
    "General complaint captured and routed for further classification by domain specialist.",
  ],
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const eq = token.indexOf("=");
    if (eq > -1) {
      out[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function normalizeHeaderKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toTrimmedString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function digitsOnly(value) {
  return toTrimmedString(value).replace(/\D/g, "");
}

function pickRowValue(row, aliases) {
  for (const key of Object.keys(row)) {
    const normalized = normalizeHeaderKey(key);
    if (!normalized) continue;
    if (aliases.includes(normalized)) {
      const value = toTrimmedString(row[key]);
      if (value) return value;
    }
  }
  return "";
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function weightedStatus() {
  const roll = Math.random();
  let acc = 0;
  for (const item of STATUS_WEIGHTS) {
    acc += item.weight;
    if (roll <= acc) return item.value;
  }
  return "Pending";
}

function asIsoDate(value) {
  const text = toTrimmedString(value);
  if (!text) return "";

  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }

  const excelSerial = Number(text);
  if (Number.isFinite(excelSerial) && excelSerial > 25000 && excelSerial < 90000) {
    const parsed = XLSX.SSF.parse_date_code(excelSerial);
    if (parsed?.y && parsed?.m && parsed?.d) {
      const y = String(parsed.y);
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  return "";
}

function normalizeComplaintType(domainLike) {
  const raw = toTrimmedString(domainLike);
  if (!raw) return "Krushik Advisory";
  const lowered = raw.toLowerCase();

  for (const mapper of DOMAIN_TO_TYPE) {
    if (mapper.keys.some((k) => lowered.includes(k))) {
      return mapper.type;
    }
  }

  const known = new Set([
    "Krushik Advisory",
    "Fasal (Crop Management)",
    "Map My Crop",
    "Fertilizer Management",
    "Insecticide & Pest Control",
    "Soil Testing",
    "Irrigation Management",
    "Farmer Outreach",
    "Other",
  ]);

  if (known.has(raw)) return raw;
  return "Krushik Advisory";
}

function buildComplaintText(type, sourceDescription, farmerName) {
  const templates = DESCRIPTION_TEMPLATES[type] ?? DESCRIPTION_TEMPLATES.Other;
  const generated = randomPick(templates);
  const cleanSource = toTrimmedString(sourceDescription);

  if (!cleanSource) {
    return `${generated} Reported by ${farmerName}.`;
  }

  return `${generated} Additional details: ${cleanSource}`;
}

function maybeNumberString(value) {
  const text = toTrimmedString(value);
  if (!text) return "";
  const digits = digitsOnly(text);
  return digits.length >= 10 ? digits.slice(-10) : text;
}

function getEnv(key, fallback = "") {
  const raw = process.env[key];
  if (raw === undefined || raw === null) return fallback;
  return String(raw).trim();
}

function buildPublicS3Url(key) {
  const base = getEnv("AWS_S3_PUBLIC_BASE_URL", "").replace(/\/+$/, "");
  if (base) return `${base}/${key}`;

  const bucket = getEnv("AWS_S3_BUCKET", "");
  const region = getEnv("AWS_REGION", "");
  if (!bucket || !region) return "";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function createS3Client() {
  const region = getEnv("AWS_REGION", "");
  const accessKeyId = getEnv("AWS_ACCESS_KEY_ID", "");
  const secretAccessKey = getEnv("AWS_SECRET_ACCESS_KEY", "");
  const sessionToken = getEnv("AWS_SESSION_TOKEN", "");

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    });
  }

  return new S3Client({ region });
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".heic") return "image/heic";
  if (ext === ".heif") return "image/heif";
  return "application/octet-stream";
}

async function listImageFiles(rootDir) {
  const output = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"].includes(ext)) {
          output.push(full);
        }
      }
    }
  }

  await walk(rootDir);
  return output;
}

async function uploadImageToStorage(sourcePath, options) {
  const { useS3, s3Client, bucket, prefix, localTargetDir } = options;

  if (useS3) {
    const datePart = new Date().toISOString().slice(0, 10);
    const ext = path.extname(sourcePath).toLowerCase();
    const key = `${prefix}/complaint/${datePart}/${randomUUID()}${ext}`;
    const buffer = await fs.readFile(sourcePath);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: getMimeType(sourcePath),
        Metadata: {
          uploaded_by: "excel-seed-script",
          purpose: "complaint",
        },
      }),
    );

    const publicUrl = buildPublicS3Url(key);
    if (!publicUrl) {
      throw new Error("S3 upload succeeded but public URL could not be built. Check AWS_S3_PUBLIC_BASE_URL.");
    }
    return publicUrl;
  }

  await fs.mkdir(localTargetDir, { recursive: true });
  const ext = path.extname(sourcePath).toLowerCase();
  const fileName = `${Date.now()}-${randomUUID()}${ext}`;
  const destPath = path.join(localTargetDir, fileName);
  await fs.copyFile(sourcePath, destPath);
  return `/uploads/complaint/seed/${fileName}`;
}

function normalizeFarmerRecord(raw) {
  const prn = toTrimmedString(raw?.prn_no || raw?.prn);
  const phone = maybeNumberString(raw?.phone || raw?.mobile || raw?.contact);
  const name = toTrimmedString(raw?.farmer_name || raw?.name || "Unknown Farmer");
  return {
    prn_no: prn,
    farmer_name: name,
    phone,
    district: toTrimmedString(raw?.district || ""),
    taluka: toTrimmedString(raw?.taluka || ""),
    village: toTrimmedString(raw?.village || ""),
    state: toTrimmedString(raw?.state || "Maharashtra"),
  };
}

function buildProgressEntries(status, createdAt, assigneeName) {
  const entries = [
    {
      date: createdAt,
      note: `Complaint created${assigneeName ? ` and assigned to ${assigneeName}` : ""}`,
    },
  ];

  if (status === "In Progress" || status === "Solved") {
    entries.push({
      date: new Date(createdAt.getTime() + randomInt(2, 72) * 60 * 60 * 1000),
      note: "Complaint acknowledged and investigation initiated.",
    });
  }

  if (status === "Solved") {
    entries.push({
      date: new Date(createdAt.getTime() + randomInt(3, 12) * 24 * 60 * 60 * 1000),
      note: "Resolution provided and complaint marked as solved.",
    });
  }

  return entries;
}

function parseExcelRows(filePath, sheetName) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const selectedSheet = sheetName || workbook.SheetNames[0];
  if (!selectedSheet || !workbook.Sheets[selectedSheet]) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[selectedSheet], {
    defval: "",
    raw: false,
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No rows found in Excel sheet.");
  }

  return { rows, selectedSheet };
}

function normalizeSourceRow(row) {
  return {
    prn_no: pickRowValue(row, ["prn", "prnno", "prnnumber", "prnnoid", "prnnoidnumber", "prn_no", "farmerid", "farmercode", "id"]),
    farmer_name: pickRowValue(row, ["name", "farmername", "farmer_name", "farmer"]),
    phone: maybeNumberString(pickRowValue(row, ["phone", "mobile", "contact", "contactnumber", "mobilenumber"])),
    state: pickRowValue(row, ["state", "province"]),
    district: pickRowValue(row, ["district", "dist"]),
    taluka: pickRowValue(row, ["taluka", "tehsil", "block"]),
    village: pickRowValue(row, ["village", "gaon"]),
    domain: pickRowValue(row, ["domain", "complainttype", "complaint_type", "type", "category"]),
    description: pickRowValue(row, ["description", "complaint", "details", "issue", "problem", "subject", "message"]),
    complaint_date: asIsoDate(pickRowValue(row, ["complaintdate", "complaint_date", "date", "createdat", "created_at"])),
    image: pickRowValue(row, ["image", "imageurl", "image_url", "photo", "filepath", "path"]),
  };
}

function normalizePrnForLookup(value) {
  return toTrimmedString(value).toLowerCase();
}

function pickFarmer(source, maps, farmerPool) {
  const prnKey = normalizePrnForLookup(source.prn_no);
  if (prnKey && maps.byPrn.has(prnKey)) {
    return { farmer: maps.byPrn.get(prnKey), matchType: "prn" };
  }

  const phone = maybeNumberString(source.phone);
  if (phone && maps.byPhone.has(phone)) {
    return { farmer: maps.byPhone.get(phone), matchType: "phone" };
  }

  return { farmer: randomPick(farmerPool), matchType: "random" };
}

function buildComplaintId(existingIds) {
  for (let i = 0; i < 3000; i += 1) {
    const candidate = `CID-${randomInt(1000, 9999)}`;
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }
  }

  // Fallback when 4-digit space becomes crowded.
  for (let i = 0; i < 30000; i += 1) {
    const candidate = `CID-${randomInt(10000, 99999)}`;
    if (!existingIds.has(candidate)) {
      existingIds.add(candidate);
      return candidate;
    }
  }

  throw new Error("Unable to generate unique complaint_id.");
}

function createAssigneePicker(employees, activeCounts) {
  return function pickAssignee(complaintType, status) {
    if (!Array.isArray(employees) || employees.length === 0) {
      return { assigned_to: null, assigned_to_name: null };
    }

    let candidates = employees.filter((e) => toTrimmedString(e.domain).toLowerCase() === complaintType.toLowerCase());
    if (candidates.length === 0) {
      candidates = employees;
    }

    candidates.sort((a, b) => {
      const aId = toTrimmedString(a._id);
      const bId = toTrimmedString(b._id);
      const aCount = activeCounts.get(aId) ?? 0;
      const bCount = activeCounts.get(bId) ?? 0;
      return aCount - bCount;
    });

    const winner = candidates[0];
    const winnerId = toTrimmedString(winner._id);
    if (winnerId && status !== "Solved") {
      activeCounts.set(winnerId, (activeCounts.get(winnerId) ?? 0) + 1);
    }

    return {
      assigned_to: winnerId || null,
      assigned_to_name: toTrimmedString(winner.name) || null,
    };
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log(`
Usage:
  node scripts/import-complaints-excel.mjs --file <path.xlsx> [options]

Options:
  --sheet <name>          Sheet name (default: first sheet)
  --count <number>        Number of complaints to insert (200-1000)
  --image-dir <path>      Directory of images for optional attachments
  --image-prob <0..1>     Image attachment probability (default: 0.4)
  --db-name <name>        Mongo database name override
  --dry-run               Parse and map data without inserting
  --help                  Show help
`);
    return;
  }

  const excelArg = toTrimmedString(args.file || args.excel || "");
  if (!excelArg) {
    throw new Error("Missing required argument --file <path-to-excel>");
  }

  const excelPath = path.isAbsolute(excelArg)
    ? excelArg
    : path.resolve(process.cwd(), excelArg);

  const stat = await fs.stat(excelPath).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  const { rows, selectedSheet } = parseExcelRows(excelPath, toTrimmedString(args.sheet || ""));
  const parsedCount = Number(args.count);
  const targetCount = Number.isFinite(parsedCount)
    ? clamp(Math.floor(parsedCount), 200, 1000)
    : clamp(rows.length, 200, 1000);

  const imageProbabilityInput = Number(args["image-prob"]);
  const imageProbability = Number.isFinite(imageProbabilityInput)
    ? clamp(imageProbabilityInput, 0.3, 0.5)
    : 0.4;

  const uri = getEnv("MONGODB_URI", "");
  if (!uri) {
    throw new Error("MONGODB_URI is required in environment.");
  }

  const dbName = toTrimmedString(args["db-name"] || getEnv("MONGODB_DB_NAME", "kvk_portal"));

  const imageDirArg = toTrimmedString(args["image-dir"] || "");
  const imageDir = imageDirArg
    ? (path.isAbsolute(imageDirArg) ? imageDirArg : path.resolve(process.cwd(), imageDirArg))
    : "";

  let imageFiles = [];
  if (imageDir) {
    const dirStat = await fs.stat(imageDir).catch(() => null);
    if (!dirStat || !dirStat.isDirectory()) {
      throw new Error(`--image-dir is not a valid directory: ${imageDir}`);
    }
    imageFiles = await listImageFiles(imageDir);
  }

  const useS3 = Boolean(getEnv("AWS_REGION", "") && getEnv("AWS_S3_BUCKET", ""));
  const s3Client = useS3 ? createS3Client() : null;
  const s3Bucket = getEnv("AWS_S3_BUCKET", "");
  const s3Prefix = getEnv("AWS_S3_PREFIX", "uploads").replace(/^\/+|\/+$/g, "");
  const localImageDir = path.join(REPO_ROOT, "public", "uploads", "complaint", "seed");

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const complaintsCollection = db.collection("complaints");
    const farmersCollection = db.collection("Farmers");
    const legacyFarmersCollection = db.collection("farmers");
    const employeesCollection = db.collection("employees");

    const [farmers, legacyFarmers, employees, existingComplaints, activeLoads] = await Promise.all([
      farmersCollection.find({}).toArray(),
      legacyFarmersCollection.find({}).toArray().catch(() => []),
      employeesCollection.find({ role: "employee" }).toArray(),
      complaintsCollection.find({}, { projection: { complaint_id: 1 } }).toArray(),
      complaintsCollection
        .aggregate([
          { $match: { assigned_to: { $exists: true, $ne: null }, solve_status: { $ne: "Solved" } } },
          { $group: { _id: "$assigned_to", count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const farmerPool = [...farmers, ...legacyFarmers].map(normalizeFarmerRecord).filter((f) => f.prn_no || f.phone);
    if (farmerPool.length === 0) {
      throw new Error("No farmers found in Farmers/farmers collections.");
    }

    const byPrn = new Map();
    const byPhone = new Map();
    for (const farmer of farmerPool) {
      if (farmer.prn_no) byPrn.set(normalizePrnForLookup(farmer.prn_no), farmer);
      if (farmer.phone) byPhone.set(farmer.phone, farmer);
    }

    const existingIds = new Set(
      existingComplaints
        .map((doc) => toTrimmedString(doc?.complaint_id))
        .filter(Boolean),
    );

    const activeCounts = new Map();
    for (const row of activeLoads) {
      const id = toTrimmedString(row?._id);
      if (!id) continue;
      activeCounts.set(id, Number(row?.count || 0));
    }

    const pickAssignee = createAssigneePicker(employees, activeCounts);

    const statusSummary = {
      Pending: 0,
      "In Progress": 0,
      Solved: 0,
    };

    const matchSummary = {
      prn: 0,
      phone: 0,
      random: 0,
    };

    let withImageCount = 0;
    let withoutImageCount = 0;
    let failedCount = 0;
    const failures = [];
    const docsToInsert = [];

    for (let i = 0; i < targetCount; i += 1) {
      const row = rows[i % rows.length];

      try {
        const source = normalizeSourceRow(row);
        const { farmer, matchType } = pickFarmer(source, { byPrn, byPhone }, farmerPool);
        matchSummary[matchType] += 1;

        const complaintType = normalizeComplaintType(source.domain || source.description);
        const complaintStatus = weightedStatus();
        statusSummary[complaintStatus] += 1;

        const createdAt = new Date(Date.now() - randomInt(0, 120) * 24 * 60 * 60 * 1000);
        const complaintDate = source.complaint_date || createdAt.toISOString().slice(0, 10);
        const complaintId = buildComplaintId(existingIds);

        let imageUrl = "";
        const shouldAttachImage = Math.random() < imageProbability;

        if (shouldAttachImage) {
          const rowImage = toTrimmedString(source.image);
          let imagePath = "";

          if (/^https?:\/\//i.test(rowImage)) {
            imageUrl = rowImage;
          } else {
            if (rowImage) {
              if (path.isAbsolute(rowImage)) {
                imagePath = rowImage;
              } else if (imageDir) {
                imagePath = path.resolve(imageDir, rowImage);
              } else {
                imagePath = path.resolve(path.dirname(excelPath), rowImage);
              }

              const exists = await fs.stat(imagePath).then((s) => s.isFile()).catch(() => false);
              if (!exists) imagePath = "";
            }

            if (!imagePath && imageFiles.length > 0) {
              imagePath = randomPick(imageFiles);
            }

            if (imagePath) {
              imageUrl = await uploadImageToStorage(imagePath, {
                useS3,
                s3Client,
                bucket: s3Bucket,
                prefix: s3Prefix,
                localTargetDir: localImageDir,
              });
            }
          }
        }

        if (imageUrl) withImageCount += 1;
        else withoutImageCount += 1;

        const assignee = pickAssignee(complaintType, complaintStatus);

        docsToInsert.push({
          complaint_id: complaintId,
          prn_no: farmer.prn_no || source.prn_no || `PRN-${randomInt(100000, 999999)}`,
          farmer_name: farmer.farmer_name || source.farmer_name || "Farmer",
          complaint_date: complaintDate,
          mobile: farmer.phone || source.phone || "",
          state: source.state || farmer.state || "Maharashtra",
          district: source.district || farmer.district || "",
          taluka: source.taluka || farmer.taluka || "",
          village: source.village || farmer.village || "",
          complaint_type: complaintType,
          complaint: buildComplaintText(
            complaintType,
            source.description,
            farmer.farmer_name || source.farmer_name || "farmer",
          ),
          image: imageUrl,
          solve_status: complaintStatus,
          source: "excel_import",
          assigned_to: assignee.assigned_to,
          registered_by: "excel-seed-script",
          created_at: createdAt,
          updated_at: new Date(createdAt.getTime() + randomInt(1, 96) * 60 * 60 * 1000),
          progress: buildProgressEntries(complaintStatus, createdAt, assignee.assigned_to_name),
        });
      } catch (rowError) {
        failedCount += 1;
        failures.push({
          row: i + 1,
          error: rowError instanceof Error ? rowError.message : String(rowError),
        });
      }
    }

    let insertedCount = 0;
    if (!args["dry-run"] && docsToInsert.length > 0) {
      try {
        const result = await complaintsCollection.insertMany(docsToInsert, {
          ordered: false,
        });
        insertedCount = Number(result?.insertedCount || 0);
      } catch (insertError) {
        const partial = Number(insertError?.result?.result?.nInserted || 0);
        insertedCount = partial;

        const writeErrors = Array.isArray(insertError?.writeErrors)
          ? insertError.writeErrors
          : [];
        failedCount += writeErrors.length;
        for (const we of writeErrors.slice(0, 10)) {
          failures.push({
            row: Number(we?.index ?? -1) + 1,
            error: toTrimmedString(we?.errmsg || we?.message || "Bulk insert failure"),
          });
        }

        console.error(
          `Bulk insert completed with partial failures. Inserted: ${insertedCount}, Failed writes: ${writeErrors.length}`,
        );
      }
    }

    const summary = {
      mode: args["dry-run"] ? "dry-run" : "insert",
      excelFile: excelPath,
      sheet: selectedSheet,
      requested: targetCount,
      inserted: args["dry-run"] ? 0 : insertedCount,
      prepared: docsToInsert.length,
      failed: failedCount,
      matchedFarmers: matchSummary,
      statusWise: statusSummary,
      images: {
        withImage: withImageCount,
        withoutImage: withoutImageCount,
        strategy: useS3 ? "s3" : "local-public-folder",
      },
      sampleFailures: failures.slice(0, 10),
    };

    console.log("\nComplaint import summary:\n");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error("\nComplaint import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
