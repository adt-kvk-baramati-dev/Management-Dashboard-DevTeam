import dotenv from "dotenv";
import dns from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import { randomUUID } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { handleDemo } from "./routes/demo";
import { ensureMongoCollections } from "./mongoSchema";
import { COMPLAINT_CATEGORIES, EMPLOYEE_PROFILE_ROLES, STANDARDIZED_WORK_ROLES } from "../shared/appConstants";

type S3UploadPurpose =
  | "profile"
  | "outreach"
  | "complaint"
  | "field-visit"
  | "generic";

dotenv.config({ override: true });

type EmployeeRole = (typeof EMPLOYEE_PROFILE_ROLES)[number];

type EmployeeDocument = {
  _id?: ObjectId;
  employee_id?: string;
  name: string;
  role: EmployeeRole;
  email: string;
  profile_photo?: string | null;
  profile_photo_updated_at?: Date | null;
  domain?: string | null;
  contact?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  domain_expertise?: string | null;
  password_hash: string;
  created_at: Date;
};

type RegisterDocument = {
  _id?: ObjectId;
  prn_no: string;
  farmer_name: string;
  phone: string;
  district: string;
  village: string;
  created_by?: string;
  name?: string;
  mobile?: string;
  role?: string;
  taluka?: string;
  complaint_type?: string;
  created_at: Date;
};

type FarmerResponse = {
  id: string;
  prn_no: string;
  name: string;
  phone: string;
  district: string;
  taluka?: string;
  village: string;
};

type ComplaintStatus = "Pending" | "Solved" | "In Progress";

type ComplaintProgress = {
  date: Date | string;
  note: string;
};

type ComplaintSource = "call" | "field_visit" | "excel_import";

type ComplaintDocument = {
  _id?: ObjectId;
  complaint_id?: string;
  date?: Date;
  farmer_name: string;
  name?: string;
  subject?: string;
  issue?: string;
  solve_status?: ComplaintStatus;
  source?: ComplaintSource;
  registered_by?: string;
  resolution_notes?: string;
  prn_no: string;
  prn?: string;
  complaint_date?: string;
  sugar_factory_name?: string;
  mobile?: string;
  district?: string;
  taluka?: string;
  village?: string;
  complaint_type?: string;
  complaint?: string;
  image?: string;
  routed_to?: string;
  auto_classification?: string;
  assignedEmployees?: string[];
  solved_by?: string | null;
  solved_by_name?: string | null;
  solved_remark?: string | null;
  created_at: Date;
  updated_at?: Date;
  progress?: ComplaintProgress[];
};

type EmployeeActivityDocument = {
  _id?: ObjectId;
  employee_id: string;
  activity_type: "field_visit" | "expert_session" | "seminar" | "sampling" | "OUTREACH_CONDUCTED" | "OUTREACH_ATTENDED";
  date?: Date;
  location?: string;
  description?: string;
  created_at?: Date;
};

type FarmerVisitDocument = {
  _id?: ObjectId;
  prn?: string;
  visit_date?: string;
  farmer_name?: string;
  district?: string;
  taluka?: string;
  village?: string;
};

type FasalHistoryDocument = {
  _id?: ObjectId;
  prn_no: string;
  record_date?: Date;
  created_at?: Date;
};

type KvkDataDocument = {
  _id?: ObjectId;
  prn_no: string;
  record_date?: Date;
  created_at?: Date;
};

type MapMyCropDocument = {
  _id?: ObjectId;
  prn_no: string;
  record_date?: Date;
  created_at?: Date;
};

type OutreachProgrammeDocument = {
  _id?: ObjectId;
  employee_id: string;
  employee_name?: string;
  created_by?: string;
  outreach_type: "conducted" | "attended";
  section_type?: "conducted" | "attended";
  program_title: string;
  program_type?: string;
  organizer?: string;
  role?: string;
  location: string;
  date: string;
  remarks?: string;
  key_learning?: string;
  detailed_report?: string;
  supporting_documents?: Array<{ name: string; url: string }>;
  geo_tagged_photo?: string;
  additional_program_photos?: string[];
  certificate?: string;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
  geo_location_label?: string;
  created_date?: Date;
  last_updated?: Date;

  // Legacy fields retained for compatibility with existing records.
  duration?: number;
  photos?: string[];
  agronomist_specialist?: string;
  no_of_people?: number;
  instructor?: string;
  
  district?: string;
  taluka?: string;
  village?: string;
  created_at?: Date;
  updated_at?: Date;
};

type MapFeedbackDocument = {
  _id?: ObjectId;
  employee_id?: string;
  employee_name?: string;
  prn?: string;
  farmer_name?: string;
  mobile?: string;
  plantation_date?: string;
  district?: string;
  taluka?: string;
  village?: string;
  ndvi_image?: string;
  ndvi_interpretation?: string;
  ndvi_feedback?: string;
  evi_image?: string;
  evi_interpretation?: string;
  evi_feedback?: string;
  crop_image?: string;
  crop_interpretation?: string;
  crop_feedback?: string;
  water_image?: string;
  water_interpretation?: string;
  water_feedback?: string;
  growth_image?: string;
  growth_interpretation?: string;
  growth_feedback?: string;
  vra_image?: string;
  vra_interpretation?: string;
  vra_feedback?: string;
  mmc_image?: string;
  mmc_interpretation?: string;
  mmc_feedback?: string;
  fasal_image?: string;
  fasal_interpretation?: string;
  fasal_feedback?: string;
  remark?: string;
  created_at?: Date;
};

type NotificationDocument = {
  _id?: ObjectId;
  message: string;
  sent_by: string;
  sent_at: Date;
  type: string;
};

type FieldVisitDocument = {
  _id?: ObjectId;
  employee_id?: string;
  employee_name?: string;
  prn?: string;
  visit_date?: string;
  farmer_name?: string;
  district?: string;
  taluka?: string;
  village?: string;
  soil_condition?: string;
  soil_temp?: string;
  soil_moisture?: string;
  irrigation?: string;
  fertilizer?: string;
  deficiency?: string;
  pest_attack?: string;
  disease_symptoms?: string;
  disease_image?: string;
  krushik?: string;
  reason?: string;
  spray?: string;
  health?: string;
  germination?: string;
  tillers?: string;
  height?: string;
  girth?: string;
  geo_tag_image?: string;
  observations?: string;
  remark?: string;
  created_at?: Date;
  mobile_no?: string;
  planting_date?: string;
  harvesting_date?: string;
  area?: string;
  rainfall_last_week?: string;
  rainfall_last_week_qty?: string;
  irrigation_advisories?: string;
  last_irrigation_date?: string;
  irrigation_advisories_useful?: string;
  irrigation_advisories_remark?: string;
  irrigation_method?: string;
  soil_moisture_match?: string;
  iot_sensor_working?: string;
  fertilizer_advisories?: string;
  follow_fertilizer_advisory?: string;
  applied_fertilizer_recently?: string;
  fertilizer_type?: string;
  fertilizer_quantity?: string;
  fertilizer_application_date?: string;
  nutrient_deficiency?: string;
  nutrient_deficiency_type?: string | string[];
  nutrient_deficiency_image?: string;
  pest_disease_alerts?: string;
  pest_disease_observed_name?: string;
  pest_disease_image?: string;
  pest_disease_alerts_useful?: string;
  pest_attack_name?: string;
  pest_attack_image?: string;
  disease_observed?: string;
  disease_name?: string;
  last_spray_date?: string;
  spray_type?: string;
  spray_dosage?: string;
  spray_challenges?: string;
  spray_challenges_remark?: string;
  vegetative_maps_displayed?: string;
  crop_health_maps_match?: string;
  crop_health_maps_match_remark?: string;
  ai_recommendations_satisfaction?: string;
  point_a_tillers?: string;
  point_a_height?: string;
  point_a_girth?: string;
  point_a_green_leaves?: string;
  point_a_geo_tag_image?: string;
  point_a_scale_image?: string;
  point_b_tillers?: string;
  point_b_height?: string;
  point_b_girth?: string;
  point_b_green_leaves?: string;
  point_b_geo_tag_image?: string;
  point_b_scale_image?: string;
  point_c_tillers?: string;
  point_c_height?: string;
  point_c_girth?: string;
  point_c_green_leaves?: string;
  point_c_geo_tag_image?: string;
  point_c_scale_image?: string;
  crop_health_condition?: string;
  app_benefits?: string;
  app_challenges?: string;
  app_suggestions?: string;
  farmer_observations?: string;
};

type UserLoginDocument = {
  _id?: ObjectId;
  email?: string;
  created_at?: Date;
};

type UserDocument = {
  _id?: ObjectId;
  email?: string;
  role?: EmployeeRole;
};

type AdminDocument = {
  _id?: ObjectId;
  name?: string;
  email?: string;
  password?: string;
  mobile?: string;
};

type Collections = {
  admin: AdminDocument;
  complaints: ComplaintDocument;
  employee_activities: EmployeeActivityDocument;
  employees: EmployeeDocument;
  farmer_visits: FarmerVisitDocument;
  field_visits: FieldVisitDocument;
  fasal_history: FasalHistoryDocument;
  kvk_data: KvkDataDocument;
  map_feedback: MapFeedbackDocument;
  map_my_crop: MapMyCropDocument;
  notifications: NotificationDocument;
  outreach_programmes: OutreachProgrammeDocument;
  Farmers: RegisterDocument;
  user_login: UserLoginDocument;
  users: UserDocument;
};

type CollectionName = keyof Collections;

function getCollection<K extends CollectionName>(
  db: ReturnType<MongoClient["db"]>,
  name: K,
) {
  return db.collection<Collections[K]>(name);
}

type LegacyFarmerDocument = {
  _id?: ObjectId;
  prn_no: string;
  name: string;
  phone: string;
  district: string;
  taluka?: string;
  village: string;
  created_by: string;
  created_at: Date;
};

function getMongoUri() {
  return process.env.MONGODB_URI ?? "";
}
function getMongoDbName() {
  return process.env.MONGODB_DB_NAME ?? "kvk_portal";
}
function getJwtSecret() {
  return process.env.JWT_SECRET ?? "";
}

type UploadRecord = Record<string, any>;

let mongoClient: MongoClient | null = null;
let mongoReadyPromise: Promise<void> | null = null;
let mongoStartupError: Error | null = null;
let dnsConfigured = false;
let mongoLookupConfigured = false;
let mongoLookupResolver: dns.Resolver | null = null;

function configureMongoDns() {
  if (dnsConfigured) return;
  const configured = String(process.env.MONGODB_DNS_SERVERS ?? "").trim();
  if (!configured) {
    dnsConfigured = true;
    return;
  }

  const servers = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
  }
  dnsConfigured = true;
}

function configureMongoLookupResolver() {
  if (mongoLookupConfigured) return;
  const configured = String(process.env.MONGODB_DNS_SERVERS ?? "").trim();
  if (!configured) {
    mongoLookupConfigured = true;
    return;
  }

  const servers = configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    const resolver = new dns.Resolver();
    resolver.setServers(servers);
    mongoLookupResolver = resolver;
  }

  mongoLookupConfigured = true;
}

function mongoLookup(
  hostname: string,
  options: LookupOptions,
  callback?: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) {
  const resolvePromise = new Promise<{
    address: string | LookupAddress[];
    family: number;
  }>((resolve, reject) => {
    if (!mongoLookupResolver) {
      dns.lookup(hostname, options, (error, address, family) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ address, family: family ?? 0 });
      });
      return;
    }

    mongoLookupResolver.resolve4(hostname, (error4, addresses4 = []) => {
      if (!error4 && addresses4.length > 0) {
        if (options?.all) {
          resolve({
            address: addresses4.map((address) => ({ address, family: 4 })),
            family: 4,
          });
          return;
        }

        resolve({ address: addresses4[0], family: 4 });
        return;
      }

      mongoLookupResolver!.resolve6(hostname, (error6, addresses6 = []) => {
        if (!error6 && addresses6.length > 0) {
          if (options?.all) {
            resolve({
              address: addresses6.map((address) => ({ address, family: 6 })),
              family: 6,
            });
            return;
          }

          resolve({ address: addresses6[0], family: 6 });
          return;
        }

        reject(
          (error4 ||
            error6 ||
            new Error(
              `No IP address found for ${hostname}`,
            )) as NodeJS.ErrnoException,
        );
      });
    });
  });

  if (callback) {
    void resolvePromise
      .then(({ address, family }) => callback(null, address, family))
      .catch((error) => callback(error as NodeJS.ErrnoException, "", 0));
    return;
  }

  return resolvePromise;
}

function requireEnvValue(value: string, key: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

function getAwsRegion() {
  return String(process.env.AWS_REGION ?? "").trim();
}

function getAwsAccessKeyId() {
  return String(process.env.AWS_ACCESS_KEY_ID ?? "").trim();
}

function getAwsSecretAccessKey() {
  return String(process.env.AWS_SECRET_ACCESS_KEY ?? "").trim();
}

function getAwsSessionToken() {
  return String(process.env.AWS_SESSION_TOKEN ?? "").trim();
}

function getS3Bucket() {
  return String(process.env.AWS_S3_BUCKET ?? "").trim();
}

function getS3Prefix() {
  const raw = String(process.env.AWS_S3_PREFIX ?? "uploads").trim();
  return raw.replace(/^\/+/, "").replace(/\/+$/, "");
}

function getS3PublicBaseUrl() {
  const raw = String(process.env.AWS_S3_PUBLIC_BASE_URL ?? "").trim();
  return raw.replace(/\/+$/, "");
}

function guessFileExtension(contentType: string, fileName?: string) {
  const name = String(fileName ?? "").trim();
  const lastDot = name.lastIndexOf(".");
  const ext = lastDot >= 0 ? name.slice(lastDot) : "";
  const safeExt = /^\.[a-z0-9]{1,8}$/i.test(ext) ? ext.toLowerCase() : "";
  if (safeExt) return safeExt;

  switch (contentType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/heic":
      return ".heic";
    case "image/heif":
      return ".heif";
    default:
      return "";
  }
}

function buildS3PublicUrl(key: string) {
  const baseUrl = getS3PublicBaseUrl();
  if (baseUrl) return `${baseUrl}/${key}`;

  const bucket = getS3Bucket();
  const region = getAwsRegion();
  if (!bucket || !region) return "";
  // Works when objects are publicly readable (e.g., via bucket policy) or when accessed through a CDN.
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function createS3ClientFromEnv() {
  const region = getAwsRegion();
  const accessKeyId = getAwsAccessKeyId();
  const secretAccessKey = getAwsSecretAccessKey();
  const sessionToken = getAwsSessionToken();

  // Use explicit credentials when provided (common for local dev).
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

  // Fallback to default provider chain (IAM role, shared config, etc.).
  return new S3Client({ region });
}

function normalizePrn(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toDate(value: unknown): Date {
  if (!value) return new Date();
  const dt = new Date(String(value));
  if (Number.isNaN(dt.getTime())) return new Date();
  return dt;
}

function getRecordDate(record: UploadRecord): Date {
  return toDate(
    record.record_date ??
      record.date ??
      record.satellite_date ??
      record.complaint_date,
  );
}

function sanitizeUploadDocument(record: Record<string, any>) {
  const clone = { ...record };
  delete clone._id;
  delete clone.created_at;
  return clone;
}

async function executeBulkUpdates(
  collection: any,
  operations: any[],
  chunkSize = 1000,
) {
  if (operations.length === 0) return 0;

  let changedCount = 0;
  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    const result = await collection.bulkWrite(chunk, { ordered: false });
    changedCount += (result.upsertedCount ?? 0) + (result.modifiedCount ?? 0);
  }

  return changedCount;
}

function pickLatestByPrn(rows: UploadRecord[]): Map<string, UploadRecord> {
  const map = new Map<string, UploadRecord>();
  for (const row of rows) {
    const prn = normalizePrn(row.prn_no);
    if (!prn) continue;
    const current = map.get(prn);
    if (!current) {
      map.set(prn, row);
      continue;
    }
    const currentDt = toDate(
      current.record_date ??
        current.updated_at ??
        current.created_at ??
        current.date,
    );
    const rowDt = toDate(
      row.record_date ?? row.updated_at ?? row.created_at ?? row.date,
    );
    if (rowDt >= currentDt) {
      map.set(prn, row);
    }
  }
  return map;
}

async function getDb() {
  requireEnvValue(getMongoUri(), "MONGODB_URI");
  configureMongoDns();
  configureMongoLookupResolver();
  if (!mongoClient) {
    const candidateClient = new MongoClient(getMongoUri(), {
      lookup: mongoLookup,
    });
    try {
      await candidateClient.connect();
      mongoClient = candidateClient;
    } catch (error) {
      await candidateClient.close().catch(() => {
        // Ignore close errors on failed connect path.
      });
      mongoClient = null;
      throw error;
    }
  }
  return mongoClient.db(getMongoDbName());
}

async function ensureMongoSetup() {
  if (mongoReadyPromise) return mongoReadyPromise;

  mongoReadyPromise = (async () => {
    const db = await getDb();
    await ensureMongoCollections(db);

    const employees = getCollection(db, "employees");

    const adminEmail = String(process.env.MONGO_ADMIN_EMAIL ?? "")
      .trim()
      .toLowerCase();
    const adminPassword = String(process.env.MONGO_ADMIN_PASSWORD ?? "").trim();
    const adminName = String(
      process.env.MONGO_ADMIN_NAME ?? "KVK Admin",
    ).trim();

    if (adminEmail && adminPassword) {
      const existingAdmin = await employees.findOne({ email: adminEmail });
      if (!existingAdmin) {
        const password_hash = await bcrypt.hash(adminPassword, 10);
        await employees.insertOne({
          name: adminName,
          role: "admin",
          email: adminEmail,
          domain_expertise: "Management",
          password_hash,
          created_at: new Date(),
        });
      } else {
        const passwordMatch = await bcrypt.compare(
          adminPassword,
          existingAdmin.password_hash,
        );
        if (
          !passwordMatch ||
          existingAdmin.role !== "admin" ||
          existingAdmin.name !== adminName
        ) {
          const password_hash = passwordMatch
            ? existingAdmin.password_hash
            : await bcrypt.hash(adminPassword, 10);

          await employees.updateOne(
            { _id: existingAdmin._id },
            {
              $set: {
                name: adminName,
                role: "admin",
                domain_expertise: "Management",
                password_hash,
              },
            },
          );
        }
      }
    }
  })();

  return mongoReadyPromise;
}

function getBearerToken(authorizationHeader?: string) {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  return authorizationHeader.slice("Bearer ".length).trim();
}

function signToken(payload: {
  userId: string;
  role: EmployeeRole;
  email: string;
}) {
  requireEnvValue(getJwtSecret(), "JWT_SECRET");
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

async function getRequester(
  authHeader?: string,
): Promise<{ userId: string; role: EmployeeRole; email: string } | null> {
  const token = getBearerToken(authHeader);
  if (!token) return null;

  requireEnvValue(getJwtSecret(), "JWT_SECRET");

  let decoded: any;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }

  const userId = String(decoded?.userId ?? "").trim();
  if (!userId || !ObjectId.isValid(userId)) return null;

  const db = await getDb();
  const employees = db.collection<EmployeeDocument>("employees");
  const employee = await employees.findOne({ _id: new ObjectId(userId) });
  if (!employee) return null;
  if (employee.role !== "admin" && employee.role !== "employee") return null;

  return {
    userId: employee._id.toString(),
    role: employee.role,
    email: employee.email,
  };
}

function toEmployeeResponse(employee: EmployeeDocument) {
  return {
    id: employee.employee_id || employee._id.toString(),
    name: employee.name,
    role: employee.role,
    email: employee.email,
    profile_photo: employee.profile_photo ?? null,
    profile_photo_updated_at: employee.profile_photo_updated_at ?? null,
    domain: employee.domain ?? null,
    contact: employee.contact ?? null,
    dob: employee.dob ?? null,
    gender: employee.gender ?? null,
    address: employee.address ?? null,
    domain_expertise: employee.domain_expertise ?? null,
    created_at: employee.created_at,
  };
}

function normalizeAssignedEmployees(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);
}

function normalizeComparisonValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

async function getNextEmployeeId(employees: any): Promise<string> {
  const lastEmployee = await employees
    .findOne({}, { sort: { created_at: -1 } });
  
  if (!lastEmployee?.employee_id) {
    return "E-001";
  }
  
  const numPart = parseInt(lastEmployee.employee_id.split("-")[1], 10);
  return `E-${String(numPart + 1).padStart(3, "0")}`;
}

export function createServer() {
  const app = express();
  const s3UploadParser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  void ensureMongoSetup().catch((error) => {
    mongoStartupError = error instanceof Error ? error : new Error(String(error));
    console.error("MongoDB setup failed:", error);
  });

  // Middleware
  const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = new Set<string>([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    ...configuredOrigins,
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );

  app.use((req, res, next) => {
    const startedAt = Date.now();
    const reqId = randomUUID().slice(0, 8);
    (res.locals as any).reqId = reqId;
    console.info(
      `[${reqId}] -> ${req.method} ${req.originalUrl} from ${req.ip || "unknown"}`,
    );

    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      console.info(
        `[${reqId}] <- ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`,
      );
    });

    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  app.use("/api", async (req, res, next) => {
    if (req.path === "/ping" || req.path === "/demo") {
      next();
      return;
    }

    try {
      await ensureMongoSetup();
      mongoStartupError = null;
      next();
    } catch (error) {
      const dbError = error instanceof Error ? error : new Error(String(error));
      mongoStartupError = dbError;
      console.error("Database readiness check failed:", dbError);
      res.status(503).json({
        message: "Database unavailable. Please try again in a moment.",
      });
    }
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Same-origin server upload endpoint (authenticated).
  // This avoids browser CORS failures when bucket CORS cannot be managed by current IAM permissions.
  app.post("/api/s3/upload", s3UploadParser.single("file"), async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const region = getAwsRegion();
      const bucket = getS3Bucket();
      requireEnvValue(region, "AWS_REGION");
      requireEnvValue(bucket, "AWS_S3_BUCKET");

      const file = (req as any).file as
        | {
            mimetype?: string;
            originalname?: string;
            buffer: Buffer;
          }
        | undefined;
      if (!file) {
        res.status(400).json({ message: "Missing file" });
        return;
      }

      const purposeRaw = String(req.body?.purpose ?? "generic").trim();
      const purpose: S3UploadPurpose =
        purposeRaw === "profile" ||
        purposeRaw === "outreach" ||
        purposeRaw === "complaint" ||
        purposeRaw === "field-visit" ||
        purposeRaw === "generic"
          ? (purposeRaw as S3UploadPurpose)
          : "generic";

      const isDocumentUpload = purpose === "outreach";
      if (!isDocumentUpload && !file.mimetype?.startsWith("image/")) {
        res.status(400).json({ message: "Only image files are allowed" });
        return;
      }

      const prefix = getS3Prefix();
      const date = new Date().toISOString().slice(0, 10);
      const ext = guessFileExtension(file.mimetype, file.originalname);
      const key = `${prefix}/${purpose}/${date}/${randomUUID()}${ext}`;

      const s3 = createS3ClientFromEnv();
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            uploaded_by: requester.userId,
            purpose,
          },
        }),
      );

      const publicUrl = buildS3PublicUrl(key);
      res.json({ key, publicUrl });
    } catch (error: any) {
      console.error("S3 direct upload error:", error);
      const message = String(error?.message ?? "");
      if (message.includes("Could not load credentials from any providers")) {
        res.status(500).json({
          message:
            "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or configure an IAM role for the server.",
        });
        return;
      }
      res.status(500).json({ message: error?.message ?? "Failed to upload file" });
    }
  });

  // S3 presigned URL endpoint (authenticated) - keeps AWS credentials on the server.
  app.post("/api/s3/presign", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const region = getAwsRegion();
      const bucket = getS3Bucket();
      requireEnvValue(region, "AWS_REGION");
      requireEnvValue(bucket, "AWS_S3_BUCKET");

      const purposeRaw = String(req.body?.purpose ?? "generic").trim();
      const purpose: S3UploadPurpose =
        purposeRaw === "profile" ||
        purposeRaw === "outreach" ||
        purposeRaw === "complaint" ||
        purposeRaw === "field-visit" ||
        purposeRaw === "generic"
          ? (purposeRaw as S3UploadPurpose)
          : "generic";

      const contentType = String(req.body?.contentType ?? "").trim();
      const isDocumentUpload = purpose === "outreach";
      if (!contentType || (!contentType.startsWith("image/") && !isDocumentUpload)) {
        res.status(400).json({ message: "Invalid contentType. Only image uploads are supported." });
        return;
      }

      const contentLength = Number(req.body?.contentLength ?? 0);
      if (Number.isFinite(contentLength) && contentLength > 0) {
        const maxBytes = 5 * 1024 * 1024;
        if (contentLength > maxBytes) {
          res.status(400).json({ message: "File too large. Max size is 5MB." });
          return;
        }
      }

      const fileName = String(req.body?.fileName ?? "").trim();
      const prefix = getS3Prefix();
      const date = new Date().toISOString().slice(0, 10);
      const ext = guessFileExtension(contentType, fileName);
      const key = `${prefix}/${purpose}/${date}/${randomUUID()}${ext}`;

      const s3 = createS3ClientFromEnv();
      let uploadUrl = "";
      try {
        uploadUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
            Metadata: {
              uploaded_by: requester.userId,
              purpose,
            },
          }),
          { expiresIn: 60 },
        );
      } catch (error: any) {
        const message = String(error?.message ?? "");
        if (message.includes("Could not load credentials from any providers")) {
          res.status(500).json({
            message:
              "AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or configure an IAM role for the server.",
          });
          return;
        }
        throw error;
      }

      const publicUrl = buildS3PublicUrl(key);

      res.json({
        key,
        uploadUrl,
        publicUrl,
        expiresInSeconds: 60,
      });
    } catch (error: any) {
      console.error("S3 presign error:", error);
      res.status(500).json({ message: error?.message ?? "Failed to generate upload URL" });
    }
  });

  app.get("/api/data", async (_req, res) => {
    try {
      const db = await getDb();
      const register = getCollection(db, "Farmers");
      const mapMyCrop = getCollection(db, "map_my_crop");
      const fasalHistory = getCollection(db, "fasal_history");
      const kvkData = getCollection(db, "kvk_data");

      const [farmers, mapRows, fasalRows, kvkRows] = await Promise.all([
        register.find({}).toArray(),
        mapMyCrop.find({}).toArray(),
        fasalHistory.find({}).toArray(),
        kvkData.find({}).toArray(),
      ]);

      const farmerByPrn = new Map(
        farmers.map((f) => [normalizePrn(f.prn_no), f]),
      );
      const latestMapByPrn = pickLatestByPrn(mapRows as UploadRecord[]);
      const latestFasalByPrn = pickLatestByPrn(fasalRows as UploadRecord[]);
      const latestKvkByPrn = pickLatestByPrn(kvkRows as UploadRecord[]);

      const allPrns = new Set<string>([
        ...farmerByPrn.keys(),
        ...latestMapByPrn.keys(),
        ...latestFasalByPrn.keys(),
        ...latestKvkByPrn.keys(),
      ]);

      const data = Array.from(allPrns)
        .filter((prn) => prn)
        .map((prn) => {
          const farmer = farmerByPrn.get(prn);
          const mapData = latestMapByPrn.get(prn) ?? null;
          const fasalData = latestFasalByPrn.get(prn) ?? null;
          const kvk = latestKvkByPrn.get(prn) ?? null;

          return {
            date:
              mapData?.record_date ??
              fasalData?.record_date ??
              kvk?.record_date ??
              farmer?.created_at ??
              new Date(),
            prn_no: prn,
            farmer_name:
              farmer?.farmer_name ??
              kvk?.farmer_name ??
              mapData?.farm_name ??
              "Unknown",
            map_data: mapData,
            fasal_data: fasalData,
            kvk_data: kvk,
          };
        })
        .sort((a, b) => Number(b.prn_no) - Number(a.prn_no));

      return res.json({ success: true, data });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          success: false,
          message: error?.message ?? "Unable to load data.",
        });
    }
  });

  app.post("/api/upload", async (req, res) => {
    try {
      const records = Array.isArray(req.body)
        ? req.body
        : Array.isArray(req.body?.records)
          ? req.body.records
          : null;

      if (!records || records.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "records array is required." });
      }

      const db = await getDb();
      const register = getCollection(db, "Farmers");
      const mapMyCrop = getCollection(db, "map_my_crop");
      const fasalHistory = getCollection(db, "fasal_history");
      const kvkData = getCollection(db, "kvk_data");

      const registerOps: any[] = [];
      const mapMyCropOps: any[] = [];
      const fasalHistoryOps: any[] = [];
      const kvkDataOps: any[] = [];

      for (const record of records as UploadRecord[]) {
        const prn = normalizePrn(record.prn_no ?? record.prn);
        if (!prn) continue;
        const recordDate = getRecordDate(record);

        const farmerName = String(
          record.farmer_name ?? record.name ?? "",
        ).trim();
        const phone = String(record.phone ?? record.mobile ?? "").trim();
        const district = String(record.district ?? "").trim();
        const village = String(record.village ?? "").trim();

        if (farmerName) {
          registerOps.push({
            updateOne: {
              filter: { prn_no: prn },
              update: {
                $set: {
                  farmer_name: farmerName,
                  name: farmerName,
                  phone,
                  mobile: phone,
                  district,
                  village,
                  role: "farmer",
                },
                $setOnInsert: {
                  prn_no: prn,
                  created_at: new Date(),
                },
              },
              upsert: true,
            },
          });
        }

        if (
          record.map_data ||
          record.ndvi !== undefined ||
          record.farm_id ||
          record.record_id
        ) {
          const mapRaw =
            record.map_data && typeof record.map_data === "object"
              ? record.map_data
              : record;
          const mapData = sanitizeUploadDocument(mapRaw);
          const mapRecordId = Number(mapData.record_id ?? 0);
          const mapFilter: Record<string, unknown> = {
            prn_no: prn,
            record_date: recordDate,
          };
          if (mapRecordId) mapFilter.record_id = mapRecordId;
          mapMyCropOps.push({
            updateOne: {
              filter: mapFilter,
              update: {
                $set: {
                  ...mapData,
                  prn_no: prn,
                  record_date: recordDate,
                  updated_at: new Date(),
                },
                $setOnInsert: { created_at: new Date() },
              },
              upsert: true,
            },
          });
        }

        if (record.fasal_data || record.plot_name || record.cust_id) {
          const fasalRaw =
            record.fasal_data && typeof record.fasal_data === "object"
              ? record.fasal_data
              : record;
          const fasalData = sanitizeUploadDocument(fasalRaw);
          const fasalRecordId = Number(fasalData.record_id ?? 0);
          const fasalFilter: Record<string, unknown> = {
            prn_no: prn,
            record_date: recordDate,
          };
          if (fasalRecordId) fasalFilter.record_id = fasalRecordId;
          fasalHistoryOps.push({
            updateOne: {
              filter: fasalFilter,
              update: {
                $set: {
                  ...fasalData,
                  prn_no: prn,
                  record_date: recordDate,
                  updated_at: new Date(),
                },
                $setOnInsert: { created_at: new Date() },
              },
              upsert: true,
            },
          });
        }

        if (record.kvk_data || record.week || record.ph !== undefined) {
          const kvkRaw =
            record.kvk_data && typeof record.kvk_data === "object"
              ? record.kvk_data
              : record;
          const kvk = sanitizeUploadDocument(kvkRaw);
          const week = String(kvk.week ?? "").trim() || "Week 0";
          kvkDataOps.push({
            updateOne: {
              filter: { prn_no: prn, week, record_date: recordDate },
              update: {
                $set: {
                  ...kvk,
                  prn_no: prn,
                  farmer_name: kvk.farmer_name ?? farmerName,
                  week,
                  record_date: recordDate,
                  updated_at: new Date(),
                },
                $setOnInsert: { created_at: new Date() },
              },
              upsert: true,
            },
          });
        }
      }

      const [
        upsertedRegister,
        upsertedMapMyCrop,
        upsertedFasalHistory,
        upsertedKvkData,
      ] = await Promise.all([
        executeBulkUpdates(register, registerOps),
        executeBulkUpdates(mapMyCrop, mapMyCropOps),
        executeBulkUpdates(fasalHistory, fasalHistoryOps),
        executeBulkUpdates(kvkData, kvkDataOps),
      ]);

      return res.json({
        success: true,
        message: "Upload processed successfully.",
        summary: {
          recordsReceived: records.length,
          register: upsertedRegister,
          map_my_crop: upsertedMapMyCrop,
          fasal_history: upsertedFasalHistory,
          kvk_data: upsertedKvkData,
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, message: error?.message ?? "Upload failed." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const body = req.body;
      if (!body || typeof body !== "object") {
        return res
          .status(400)
          .json({ message: "Request body must be a valid JSON object." });
      }

      const email = String((body as any).email ?? "")
        .trim()
        .toLowerCase();
      const password = String((body as any).password ?? "").trim();

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required." });
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: "Please provide a valid email." });
      }

      if (mongoStartupError) {
        console.error("Login blocked due to Mongo startup error:", mongoStartupError);
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");
      const employee = await employees.findOne({ email });
      if (!employee) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      if (!employee.password_hash) {
        return res.status(500).json({
          message: "Account configuration is invalid. Please contact an administrator.",
        });
      }

      const validPassword = await bcrypt.compare(
        password,
        employee.password_hash,
      );
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const token = signToken({
        userId: employee._id.toString(),
        role: employee.role,
        email: employee.email,
      });

      return res.json({
        message: "Login successful",
        token,
        profile: toEmployeeResponse(employee),
      });
    } catch (error: any) {
      console.error("Login route error:", error);
      return res
        .status(500)
        .json({ message: error?.message ?? "Server error during login." });
    }
  });

  app.get("/api/auth/profile", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");
      const profile = await employees.findOne({
        _id: new ObjectId(requester.userId),
      });
      if (!profile) {
        return res.status(404).json({ message: "Employee profile not found." });
      }

      return res.json({ profile: toEmployeeResponse(profile) });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to fetch profile." });
    }
  });

  app.put("/api/employees/profile", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");

      const hasProfilePhoto =
        typeof req.body.profile_photo === "string" &&
        req.body.profile_photo.trim().length > 0;
      const domainExpertise = String(req.body.domain_expertise ?? "").trim() || null;

      if (domainExpertise && !STANDARDIZED_WORK_ROLES.includes(domainExpertise as (typeof STANDARDIZED_WORK_ROLES)[number])) {
        return res.status(400).json({ message: "Select a valid standardized domain expertise." });
      }

      const updateData: Partial<EmployeeDocument> = {
        name: req.body.name,
        email: req.body.email,
        contact: req.body.contact,
        dob: req.body.dob,
        gender: req.body.gender,
        address: req.body.address,
        domain_expertise: domainExpertise,
        ...(hasProfilePhoto && {
          profile_photo: req.body.profile_photo.trim(),
          profile_photo_updated_at: new Date(),
        }),
      };

      const result = await employees.updateOne(
        { _id: new ObjectId(requester.userId) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Employee profile not found." });
      }

      const updatedProfile = await employees.findOne({
        _id: new ObjectId(requester.userId),
      });

      if (!updatedProfile) {
        return res.status(404).json({ message: "Employee profile not found." });
      }

      return res.json({
        message: "Profile updated successfully.",
        profile: toEmployeeResponse(updatedProfile),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to update profile." });
    }
  });

  app.post("/api/admin/cleanup-upload-test-data", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (requester.role !== "admin") {
        return res.status(403).json({ message: "Only admin can run cleanup." });
      }

      const db = await getDb();
      const register = getCollection(db, "Farmers");
      const mapMyCrop = getCollection(db, "map_my_crop");
      const fasalHistory = getCollection(db, "fasal_history");
      const kvkData = getCollection(db, "kvk_data");

      const bulkRows = await register
        .find(
          { farmer_name: { $regex: /^Bulk Farmer\s\d+$/i } },
          { projection: { prn_no: 1 } },
        )
        .toArray();

      const prns = Array.from(
        new Set(
          bulkRows
            .map((row) => normalizePrn((row as any).prn_no))
            .filter(Boolean),
        ),
      );
      if (prns.length === 0) {
        return res.json({
          success: true,
          message: "No bulk test data found.",
          summary: {
            bulkPrns: 0,
            register: 0,
            map_my_crop: 0,
            fasal_history: 0,
            kvk_data: 0,
          },
        });
      }

      const [registerResult, mapResult, fasalResult, kvkResult] =
        await Promise.all([
          register.deleteMany({ prn_no: { $in: prns } }),
          mapMyCrop.deleteMany({ prn_no: { $in: prns } }),
          fasalHistory.deleteMany({ prn_no: { $in: prns } }),
          kvkData.deleteMany({ prn_no: { $in: prns } }),
        ]);

      return res.json({
        success: true,
        message: "Bulk test data deleted.",
        summary: {
          bulkPrns: prns.length,
          register: registerResult.deletedCount,
          map_my_crop: mapResult.deletedCount,
          fasal_history: fasalResult.deletedCount,
          kvk_data: kvkResult.deletedCount,
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Cleanup failed." });
    }
  });

  app.post("/api/admin/reset-portal-data", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (requester.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admin can reset portal data." });
      }

      const db = await getDb();
      const complaints = getCollection(db, "complaints");
      const employeeActivities = getCollection(db, "employee_activities");
      const farmerVisits = getCollection(db, "farmer_visits");
      const fasalHistory = getCollection(db, "fasal_history");
      const kvkData = getCollection(db, "kvk_data");
      const mapFeedback = getCollection(db, "map_feedback");
      const mapMyCrop = getCollection(db, "map_my_crop");
      const outreachProgrammes = getCollection(db, "outreach_programmes");
      const register = getCollection(db, "Farmers");
      const userLogin = getCollection(db, "user_login");
      const users = getCollection(db, "users");
      const adminCollection = getCollection(db, "admin");
      const employees = getCollection(db, "employees");

      const cleanupResults = await Promise.all([
        complaints.deleteMany({}),
        employeeActivities.deleteMany({}),
        farmerVisits.deleteMany({}),
        fasalHistory.deleteMany({}),
        kvkData.deleteMany({}),
        mapFeedback.deleteMany({}),
        mapMyCrop.deleteMany({}),
        outreachProgrammes.deleteMany({}),
        register.deleteMany({}),
        userLogin.deleteMany({}),
        users.deleteMany({}),
        adminCollection.deleteMany({}),
      ]);

      await employees.deleteMany({
        email: { $nin: ["admin@kvk.in", "a@kvk.in", "b@kvk.in"] },
      });

      const adminPassword =
        String(process.env.MONGO_ADMIN_PASSWORD ?? "Admin!2026").trim() ||
        "Admin!2026";
      const employeeDefaultPassword = "ChangeMe@123";

      const [adminHash, aHash, bHash] = await Promise.all([
        bcrypt.hash(adminPassword, 10),
        bcrypt.hash(employeeDefaultPassword, 10),
        bcrypt.hash(employeeDefaultPassword, 10),
      ]);

      await Promise.all([
        employees.updateOne(
          { email: "admin@kvk.in" },
          {
            $set: {
              name: "Admin",
              role: "admin",
              email: "admin@kvk.in",
              domain_expertise: "System Administration",
              password_hash: adminHash,
            },
            $setOnInsert: { created_at: new Date() },
          },
          { upsert: true },
        ),
        employees.updateOne(
          { email: "a@kvk.in" },
          {
            $set: {
              name: "User A",
              role: "employee",
              email: "a@kvk.in",
              domain_expertise: null,
              password_hash: aHash,
            },
            $setOnInsert: { created_at: new Date() },
          },
          { upsert: true },
        ),
        employees.updateOne(
          { email: "b@kvk.in" },
          {
            $set: {
              name: "User B",
              role: "employee",
              email: "b@kvk.in",
              domain_expertise: null,
              password_hash: bHash,
            },
            $setOnInsert: { created_at: new Date() },
          },
          { upsert: true },
        ),
      ]);

      const remainingEmployees = await employees
        .find({}, { projection: { name: 1, email: 1, role: 1 } })
        .toArray();

      return res.json({
        success: true,
        message: "Farmer/demo data cleared and employee accounts reset.",
        note: "Passwords: admin uses MONGO_ADMIN_PASSWORD, a@kvk.in and b@kvk.in use ChangeMe@123.",
        deleted: {
          complaints: cleanupResults[0].deletedCount,
          employee_activities: cleanupResults[1].deletedCount,
          farmer_visits: cleanupResults[2].deletedCount,
          fasal_history: cleanupResults[3].deletedCount,
          kvk_data: cleanupResults[4].deletedCount,
          map_feedback: cleanupResults[5].deletedCount,
          map_my_crop: cleanupResults[6].deletedCount,
          outreach_programmes: cleanupResults[7].deletedCount,
          register: cleanupResults[8].deletedCount,
          user_login: cleanupResults[9].deletedCount,
          users: cleanupResults[10].deletedCount,
          admin: cleanupResults[11].deletedCount,
        },
        employees: remainingEmployees,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Reset failed." });
    }
  });

  app.get("/api/employees", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const role = String(req.query.role ?? "").trim();
      const db = await getDb();
      const employees = getCollection(db, "employees");

      const filter: Record<string, unknown> = {};
      if (role === "admin" || role === "employee") {
        filter.role = role;
      }

      const rows = await employees
        .find(filter)
        .sort({ created_at: -1 })
        .toArray();
      return res.json({ employees: rows.map(toEmployeeResponse) });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to load employees." });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admin can add employees." });
      }

      const name = String(req.body?.name ?? "").trim();
      const email = String(req.body?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password ?? "").trim();
      const domain = String(req.body?.domain ?? "").trim() || null;
      const contact = String(req.body?.contact ?? "").trim() || null;
      const dob = String(req.body?.dob ?? "").trim() || null;
      const gender = String(req.body?.gender ?? "").trim() || null;
      const address = String(req.body?.address ?? "").trim() || null;

      if (domain && !STANDARDIZED_WORK_ROLES.includes(domain as (typeof STANDARDIZED_WORK_ROLES)[number])) {
        return res.status(400).json({ message: "Select a valid standardized domain." });
      }

      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ message: "Name, email and password are required." });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");

      const existing = await employees.findOne({ email });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Employee with this email already exists." });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const employee_id = await getNextEmployeeId(employees);
      
      const insert = await employees.insertOne({
        employee_id,
        name,
        role: "employee",
        email,
        domain,
        contact,
        dob,
        gender,
        address,
        password_hash,
        created_at: new Date(),
      });

      return res.status(201).json({
        message: "Employee created successfully.",
        employee: {
          id: employee_id,
          name,
          email,
          contact,
          dob,
          gender,
          domain,
          address,
          role: "employee",
          created_at: new Date(),
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to create employee." });
    }
  });

  // Admin Report Generation
  app.post("/api/admin/generate-report", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester || requester.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { type, dateRange } = req.body;
      const db = await getDb();

      // Generate comprehensive report data
      const totalFarmers = await getCollection(db, "Farmers").countDocuments();
      const totalComplaints = await getCollection(db, "complaints").countDocuments();
      const pendingComplaints = await getCollection(db, "complaints").countDocuments({ solve_status: "Pending" });
      const solvedComplaints = await getCollection(db, "complaints").countDocuments({ solve_status: "Solved" });
      const outreachSessions = await getCollection(db, "outreach_programmes").countDocuments();

      // Get recent complaints
      const recentComplaints = await getCollection(db, "complaints")
        .find({})
        .sort({ created_at: -1 })
        .limit(10)
        .toArray();

      // Get employee stats
      const employees = await getCollection(db, "employees").find({ role: "employee" }).toArray();
      const employeeStats = await Promise.all(
        employees.map(async (emp) => {
          const empId = emp._id.toString();
          const assigned = await getCollection(db, "complaints").countDocuments({ assignedEmployees: empId });
          const solved = await getCollection(db, "complaints").countDocuments({ assignedEmployees: empId, solve_status: "Solved" });
          return {
            name: emp.name,
            assigned,
            solved,
            pending: assigned - solved
          };
        })
      );

      // Create report data
      const reportData = {
        generatedAt: new Date().toISOString(),
        summary: {
          totalFarmers,
          totalComplaints,
          pendingComplaints,
          solvedComplaints,
          outreachSessions
        },
        recentComplaints: recentComplaints.map(c => ({
          id: c.complaint_id,
          farmer: c.farmer_name,
          type: c.complaint_type,
          status: c.solve_status,
          date: c.created_at
        })),
        employeeStats
      };

      // Return JSON report (in production, you'd generate PDF)
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=kvk-report-${new Date().toISOString().split('T')[0]}.json`);
      return res.json(reportData);

    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Report generation failed" });
    }
  });

  // Admin Send Notification
  app.post("/api/admin/send-notification", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester || requester.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const db = await getDb();

      // Store notification in database
      const notification = {
        message,
        sent_by: requester.userId,
        sent_at: new Date(),
        type: "admin_broadcast"
      };

      await getCollection(db, "notifications").insertOne(notification);

      return res.json({ success: true, message: "Notification sent successfully" });

    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Notification failed" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = String(req.params.id ?? "").trim();
      if (!id) {
        return res.status(400).json({ message: "Employee ID is required." });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");

      let employee;
      // Try to find by employee_id first, then by MongoDB _id
      employee = await employees.findOne({ employee_id: id });
      
      if (!employee) {
        try {
          employee = await employees.findOne({
            _id: new ObjectId(id),
          });
        } catch {
          employee = null;
        }
      }

      if (!employee) {
        return res.status(404).json({ message: "Employee not found." });
      }

      const employeeId = employee._id?.toString();
      const complaintsCollection = getCollection(db, "complaints");
      const activitiesCollection = getCollection(db, "employee_activities");

      const activities = await activitiesCollection
        .find({ employee_id: employee.employee_id ?? "" })
        .sort({ created_at: -1 })
        .toArray();

      const complaints = employeeId
        ? await complaintsCollection
            .find({ assignedEmployees: employeeId })
            .sort({ created_at: -1 })
            .toArray()
        : [];

      return res.json({
        employee: toEmployeeResponse(employee),
        activities: activities.map((act) => ({
          id: act._id?.toString() ?? "",
          activity_type: act.activity_type,
          date: act.date ? String(act.date) : act.created_at?.toISOString().split("T")[0] ?? "",
          location: act.location ?? "",
          description: act.description ?? "",
        })),
        complaints: complaints.map((comp) => {
          let status: "open" | "in_progress" | "resolved" | "closed" = "open";
          if (comp.solve_status === "Pending") status = "open";
          else if (comp.solve_status === "In Progress") status = "in_progress";
          else if (comp.solve_status === "Solved") status = "resolved";
          else if (comp.solve_status === "Closed") status = "closed";

          return {
            id: comp._id?.toString() ?? "",
            complaint_id: comp.complaint_id ?? comp._id?.toString() ?? "",
            title: comp.complaint_type ?? comp.complaint ?? "Complaint",
            status,
            assigned_at: comp.created_at ? comp.created_at.toISOString().split("T")[0] : "",
            progress: comp.progress || [],
          };
        }),
        samplings: [],
        outreach: [],
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to load employee details." });
    }
  });

  app.get("/api/employee-activities", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const employeeId = String(req.query.employeeId ?? "").trim();
      const db = await getDb();
      const activities = getCollection(db, "employee_activities");
      const employees = getCollection(db, "employees");

      const filter: Record<string, unknown> = {};
      if (employeeId) {
        filter.employee_id = employeeId;
      }

      const activityDocs = await activities
        .find(filter)
        .sort({ created_at: -1 })
        .toArray();

      const enriched = await Promise.all(
        activityDocs.map(async (activity) => {
          const employee = await employees.findOne({
            _id: new (require("mongodb").ObjectId)(activity.employee_id),
          });
          return {
            id: activity._id?.toString() ?? "",
            employee_id: activity.employee_id ?? "",
            employee_name: employee?.name ?? "Unknown",
            activity_type: activity.activity_type ?? "field_visit",
            date: activity.date
              ? new Date(activity.date).toISOString().split("T")[0]
              : "N/A",
            location: activity.location ?? "",
            description: activity.description ?? "",
            created_at: activity.created_at,
          };
        })
      );

      return res.json({ activities: enriched });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to load activities." });
    }
  });

  app.post("/api/employee-activities", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin" && requester.role !== "employee") {
        return res.status(403).json({
          message: "Only admin or employee can log activities.",
        });
      }

      const activity_type = String(req.body?.activity_type ?? "").trim();
      const location = String(req.body?.location ?? "").trim();
      const description = String(req.body?.description ?? "").trim();
      const date = req.body?.date ? new Date(req.body.date) : new Date();

      if (!activity_type) {
        return res
          .status(400)
          .json({ message: "activity_type is required." });
      }

      const validActivityTypes = ["field_visit", "expert_session", "seminar", "OUTREACH_CONDUCTED", "OUTREACH_ATTENDED"];
      if (!validActivityTypes.includes(activity_type)) {
        return res.status(400).json({ message: "Invalid activity_type." });
      }

      const db = await getDb();
      const activities = getCollection(db, "employee_activities");

      const insert = await activities.insertOne({
        employee_id: requester.userId,
        activity_type: activity_type as "field_visit" | "expert_session" | "seminar",
        date,
        location,
        description,
        created_at: new Date(),
      });

      return res.status(201).json({
        message: "Activity logged successfully.",
        activity: {
          id: insert.insertedId.toString(),
          employee_id: requester.userId,
          activity_type: activity_type as "field_visit" | "expert_session" | "seminar",
          date: date.toISOString().split("T")[0],
          location,
          description,
        },
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to create activity." });
    }
  });

  app.get("/api/farmers", async (req, res) => {
    try {
      const db = await getDb();
      const register = getCollection(db, "Farmers");

      const rows = await register
        .find({}) // Fetch all
        .sort({ created_at: -1 })
        .toArray();

      return res.json({
        farmers: rows.map((row) => ({
          id: row._id?.toString() ?? "",
          prn: row.prn_no ?? "",
          name: row.farmer_name || row.name || "",
          phone: row.phone || row.mobile || "",
          address: row.village || "Unknown",
          taluka: row.taluka || "Unknown",
          district: row.district || "Unknown",
          state: "Maharashtra", // Mocked or add to db schema
          crop: row.complaint_type || "N/A", // Mock mapping
          farmSize: "N/A",
          lastVisit: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : "N/A",
        })),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to load farmers." });
    }
  });

  app.post("/api/farmers", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin" && requester.role !== "employee") {
        return res
          .status(403)
          .json({ message: "Only admin or employee can add farmers." });
      }

      const prnNo = String(req.body?.prn_no ?? "").trim();
      const name = String(req.body?.name ?? "").trim();
      const phone = String(req.body?.phone ?? "").trim();
      const district = String(req.body?.district ?? "").trim();
      const village = String(req.body?.village ?? "").trim();
      const taluka = String(req.body?.taluka ?? "").trim();

      if (!prnNo || !name || !phone || !district || !village) {
        return res
          .status(400)
          .json({
            message: "prn_no, name, phone, district, village are required.",
          });
      }

      const db = await getDb();
      const register = getCollection(db, "Farmers");

      const existing = await register.findOne({ prn_no: prnNo });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Farmer with this PRN already exists." });
      }

      const insert = await register.insertOne({
        prn_no: prnNo,
        farmer_name: name,
        name,
        mobile: phone,
        phone,
        district,
        taluka,
        village,
        role: "farmer",
        created_by: requester.userId,
        created_at: new Date(),
      });

      const createdFarmer = await register.findOne({ _id: insert.insertedId });
      return res.status(201).json({
        message: "Farmer created successfully.",
        farmer: createdFarmer
          ? {
              id: createdFarmer._id.toString(),
              prn_no: createdFarmer.prn_no,
              name: createdFarmer.farmer_name,
              phone: createdFarmer.phone,
              district: createdFarmer.district,
              taluka: createdFarmer.taluka ?? "",
              village: createdFarmer.village,
            }
          : null,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to create farmer." });
    }
  });



  app.get("/api/farmers/:prnNo", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const prnNo = String(req.params.prnNo ?? "").trim();
      if (!prnNo) {
        return res.status(400).json({ message: "prnNo is required." });
      }

      const db = await getDb();
      const register = getCollection(db, "Farmers");
      const farmer = await register.findOne({ prn_no: prnNo });
      if (!farmer) {
        const legacyFarmers = db.collection<LegacyFarmerDocument>("farmers");
        const legacyFarmer = await legacyFarmers.findOne({ prn_no: prnNo });
        if (legacyFarmer) {
          return res.json({
            farmer: {
              id: legacyFarmer._id.toString(),
              prn_no: legacyFarmer.prn_no,
              name: legacyFarmer.name,
              phone: legacyFarmer.phone,
              district: legacyFarmer.district,
              taluka: legacyFarmer.taluka ?? "",
              village: legacyFarmer.village,
            } as FarmerResponse,
          });
        }
        return res.status(404).json({ message: "Farmer not found." });
      }

      return res.json({
        farmer: {
          id: farmer._id.toString(),
          prn_no: farmer.prn_no,
          name: farmer.farmer_name,
          phone: farmer.phone,
          district: farmer.district,
          taluka: farmer.taluka ?? "",
          village: farmer.village,
        } as FarmerResponse,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to fetch farmer." });
    }
  });

  app.get("/api/farmers/mobile/:mobile", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      const mobile = String(req.params.mobile ?? "").trim();
  
      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required." });
      }
  
      const db = await getDb();
      const register = getCollection(db, "Farmers");
  
      const farmer = await register.findOne({
        $or: [
          { phone: mobile },
          { mobile: mobile }
        ]
      });
  
      if (!farmer) {
        return res.status(404).json({ message: "Farmer not found." });
      }
  
      return res.json({
        farmer: {
          id: farmer._id.toString(),
          prn_no: farmer.prn_no,
          name: farmer.farmer_name,
          phone: farmer.phone,
          district: farmer.district,
          taluka: farmer.taluka ?? "",
          village: farmer.village,
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        message: error?.message ?? "Unable to fetch farmer."
      });
    }
  });

  app.put("/api/farmers/:idOrPrn", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin" && requester.role !== "employee") {
        return res
          .status(403)
          .json({ message: "Only admin or employee can edit farmers." });
      }

      const idOrPrn = String(req.params.idOrPrn ?? "").trim();
      if (!idOrPrn) {
        return res.status(400).json({ message: "ID or PRN is required." });
      }

      const name = String(req.body?.name ?? "").trim();
      const phone = String(req.body?.phone ?? "").trim();
      const district = String(req.body?.district ?? "").trim();
      const village = String(req.body?.village ?? "").trim();
      const taluka = String(req.body?.taluka ?? "").trim();
      const state = String(req.body?.state ?? "").trim();
      const crop = String(req.body?.crop ?? "").trim();
      const farmSize = String(req.body?.farmSize ?? "").trim();

      if (!name || !phone || !district) {
        return res
          .status(400)
          .json({ message: "name, phone, and district are required." });
      }

      const db = await getDb();
      const register = getCollection(db, "Farmers");

      const updateData: Record<string, any> = {
        farmer_name: name,
        name,
        phone,
        mobile: phone,
        district,
        village,
        taluka,
        state,
        crop,
        farmSize,
      };

      let filter: Record<string, any> = { prn_no: idOrPrn };
      if (ObjectId.isValid(idOrPrn)) {
        filter = { _id: new ObjectId(idOrPrn) };
      }

      const result = await register.updateOne(filter, { $set: updateData });

      if (!result.matchedCount) {
        return res.status(404).json({ message: "Farmer not found." });
      }

      const updatedFarmer = await register.findOne(filter);
      return res.json({
        message: "Farmer updated successfully.",
        farmer: updatedFarmer
          ? {
              id: updatedFarmer._id.toString(),
              prn_no: updatedFarmer.prn_no,
              name: updatedFarmer.farmer_name,
              phone: updatedFarmer.phone,
              district: updatedFarmer.district,
              village: updatedFarmer.village,
            }
          : null,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to update farmer." });
    }
  });

  app.delete("/api/farmers/:idOrPrn", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admin can delete farmers." });
      }

      const idOrPrn = String(req.params.idOrPrn ?? "").trim();
      if (!idOrPrn) {
        return res.status(400).json({ message: "ID or PRN is required." });
      }

      const db = await getDb();
      const register = getCollection(db, "Farmers");

      // Try by ObjectId first, then fall back to prn_no
      let result = { deletedCount: 0 };
      if (ObjectId.isValid(idOrPrn)) {
        result = await register.deleteOne({ _id: new ObjectId(idOrPrn) });
      }
      if (!result.deletedCount) {
        result = await register.deleteOne({ prn_no: idOrPrn });
      }

      if (!result.deletedCount) {
        return res.status(404).json({ message: "Farmer not found." });
      }

      return res.json({
        message: "Farmer deleted successfully.",
        deletedCount: result.deletedCount,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to delete farmer." });
    }
  });

  app.post("/api/complaints", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const prn_no = String(req.body?.prn_no ?? "").trim();
      const farmer_name = String(req.body?.farmer_name ?? "").trim();
      const complaint_date = String(req.body?.complaint_date ?? "").trim();
      const mobile = String(req.body?.mobile ?? "").trim();
      const district = String(req.body?.district ?? "").trim();
      const taluka = String(req.body?.taluka ?? "").trim();
      const village = String(req.body?.village ?? "").trim();
      const complaint_type = String(req.body?.complaint_type ?? "").trim();
      const complaint = String(req.body?.complaint ?? "").trim();
      const image = String(req.body?.image ?? "").trim();

      if (!prn_no || !farmer_name || !complaint_type || !complaint) {
        return res.status(400).json({ message: "PRN, farmer name, complaint type and complaint details are required." });
      }

      if (!COMPLAINT_CATEGORIES.includes(complaint_type as (typeof COMPLAINT_CATEGORIES)[number])) {
        return res.status(400).json({ message: "Select a valid complaint category." });
      }

      const db = await getDb();
      const complaintsCollection = getCollection(db, "complaints");
      const employeesCollection = getCollection(db, "employees");

      const employees = await employeesCollection
        .find({ role: "employee" })
        .toArray();

      const complaintTypeKey = normalizeComparisonValue(complaint_type);
      const matchingEmployees = employees.filter((employee) => {
        const employeeDomain = normalizeComparisonValue(employee.domain);
        const employeeExpertise = normalizeComparisonValue(employee.domain_expertise);
        return employeeDomain === complaintTypeKey || employeeExpertise === complaintTypeKey;
      });

      const assignedEmployees = matchingEmployees
        .map((employee) => employee._id?.toString())
        .filter((employeeId): employeeId is string => Boolean(employeeId));

      const assignedEmployeeNames = matchingEmployees
        .map((employee) => employee.name)
        .filter((name): name is string => Boolean(name && name.trim()));

      const warning = assignedEmployees.length === 0
        ? `No active employee found for ${complaint_type}. Complaint left unassigned.`
        : null;

      const genComplaintId = () => `CID-${Math.floor(1000 + Math.random() * 9000)}`;
      let complaint_id = genComplaintId();
      while (await complaintsCollection.findOne({ complaint_id })) {
        complaint_id = genComplaintId();
      }

      const insertDoc: ComplaintDocument = {
        complaint_id,
        prn_no,
        farmer_name,
        complaint_date,
        mobile,
        district,
        taluka,
        village,
        complaint_type,
        complaint,
        image,
        solve_status: "Pending",
        registered_by: requester.userId,
        assignedEmployees,
        created_at: new Date(),
        updated_at: new Date(),
        progress: [
          {
            date: new Date(),
            note: `Complaint created${assignedEmployees.length ? ` and assigned to ${assignedEmployeeNames.join(", ")}` : ""}`,
          },
        ],
      };

      const insert = await complaintsCollection.insertOne(insertDoc);
      const newComplaint = await complaintsCollection.findOne({ _id: insert.insertedId });

      return res.status(201).json({
        message: "Complaint registered successfully.",
        complaint: {
          id: newComplaint?._id?.toString() ?? insert.insertedId.toString(),
          complaint_id,
          prn_no,
          farmer_name,
          registered_by: requester.userId,
          assignedEmployees,
          assignedEmployeeNames,
          complaint_type,
          solve_status: "Pending",
          created_at: newComplaint?.created_at,
          warning,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to create complaint." });
    }
  });

  app.get("/api/complaints", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const status = String(req.query.status ?? "").trim();
      const db = await getDb();
      const complaints = getCollection(db, "complaints");

      const filter: Record<string, unknown> = {};
      if (status === "Pending" || status === "Solved") {
        filter.solve_status = status;
      }
      if (requester.role === "employee") {
        filter.assignedEmployees = requester.userId;
      }

      const rows = await complaints
        .find(filter)
        .sort({ created_at: -1 })
        .toArray();

      const employeeIds = Array.from(
        new Set(
          rows.flatMap((row) => [
            ...normalizeAssignedEmployees(row.assignedEmployees),
            String(row.registered_by ?? "").trim(),
          ]),
        ),
      )
        .map((id) => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ObjectId[];

      const employees = employeeIds.length
        ? await getCollection(db, "employees")
            .find({ _id: { $in: employeeIds } })
            .toArray()
        : [];

      const employeeMap = new Map<string, string>(
        employees.map((emp) => [emp._id?.toString() ?? "", emp.name]),
      );

      return res.json({
        complaints: rows.map((row) => ({
          id: row._id.toString(),
          complaint_id: row.complaint_id ?? row._id.toString(),
          prn_no: row.prn_no,
          farmer_name: row.farmer_name,
          phone: row.mobile ?? "",
          subject: row.subject ?? "",
          complaint: row.complaint ?? row.issue ?? "",
          image: row.image ?? null,
          domain: row.complaint_type ?? row.subject ?? "General",
          complaint_type: row.complaint_type ?? "General",
          district: row.district ?? "",
          taluka: row.taluka ?? "",
          village: row.village ?? "",
          solve_status: row.solve_status ?? "Pending",
          solved_by: row.solved_by ?? null,
          solved_by_name: row.solved_by_name ?? null,
          solved_remark: row.solved_remark ?? null,
          registered_by: row.registered_by ?? null,
          registered_by_name: row.registered_by
            ? employeeMap.get(String(row.registered_by)) ?? "Unknown"
            : "Unknown",
          assignedEmployees: normalizeAssignedEmployees(row.assignedEmployees),
          assignedEmployeeNames: normalizeAssignedEmployees(row.assignedEmployees).map(
            (employeeId) => employeeMap.get(employeeId) ?? "Unknown",
          ),
          created_at: row.created_at,
          updated_at: row.updated_at ?? row.created_at,
          progress: row.progress || [
            { date: row.created_at, note: "Complaint registered" }
          ],
          resolution_notes: row.resolution_notes ?? "",
        })),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to fetch complaints." });
    }
  });

  app.patch("/api/complaints/:id/assign", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Only admin can assign complaints." });
      }

      const complaintId = String(req.params.id ?? "").trim();
      const employeeId = String(req.body?.employeeId ?? "").trim();

      if (!ObjectId.isValid(complaintId) || !ObjectId.isValid(employeeId)) {
        return res
          .status(400)
          .json({ message: "Valid complaint and employee ids are required." });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");
      const complaints = getCollection(db, "complaints");

      const employee = await employees.findOne({
        _id: new ObjectId(employeeId),
        role: "employee",
      });
      if (!employee) {
        return res.status(404).json({ message: "Employee not found." });
      }

      const update = await complaints.updateOne(
        { _id: new ObjectId(complaintId) },
        { $addToSet: { assignedEmployees: employeeId }, $set: { updated_at: new Date() } },
      );

      if (!update.matchedCount) {
        return res.status(404).json({ message: "Complaint not found." });
      }

      return res.json({ message: "Complaint assigned successfully." });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to assign complaint." });
    }
  });

  // Update Complaint Status
  app.patch("/api/complaints/:id/status", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const complaintId = String(req.params.id ?? "").trim();
      const { status } = req.body;
      const remark = String(req.body?.remark ?? "").trim();

      if (!ObjectId.isValid(complaintId)) {
        return res.status(400).json({ message: "Invalid complaint ID." });
      }

      if (!["Pending", "In Progress", "Solved"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");
      const complaints = getCollection(db, "complaints");

      const requesterEmployee = await employees.findOne({
        _id: new ObjectId(requester.userId),
      });

      const existingComplaint = await complaints.findOne({
        _id: new ObjectId(complaintId),
      });
      if (!existingComplaint) {
        return res.status(404).json({ message: "Complaint not found." });
      }

      if (
        requester.role !== "admin" &&
        !normalizeAssignedEmployees(existingComplaint.assignedEmployees).includes(requester.userId)
      ) {
        return res.status(403).json({ message: "You can only update complaints assigned to you." });
      }

      const update = await complaints.updateOne(
        { _id: new ObjectId(complaintId) },
        {
          $set: {
            solve_status: status,
            updated_at: new Date(),
            ...(status === "Solved"
              ? {
                  solved_by: requester.userId,
                  solved_by_name: requesterEmployee?.name ?? requester.email ?? "Unknown",
                  solved_remark: remark || null,
                }
              : {}),
          },
          $push: {
            progress: {
              date: new Date(),
              note: status === "Solved"
                ? `Solved by ${requesterEmployee?.name ?? requester.email ?? "Unknown"}${remark ? `: ${remark}` : ""}`
                : `Status changed to ${status} by ${requesterEmployee?.name ?? requester.email ?? requester.role}`
            }
          }
        },
      );

      if (!update.matchedCount) {
        return res.status(404).json({ message: "Complaint not found." });
      }

      return res.json({ message: "Complaint status updated successfully." });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to update complaint status." });
    }
  });

  // Get single complaint full details
  app.get("/api/complaints/:id", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const complaintId = String(req.params.id ?? "").trim();

      if (!ObjectId.isValid(complaintId)) {
        return res.status(400).json({ message: "Invalid complaint ID." });
      }

      const db = await getDb();
      const complaint = await getCollection(db, "complaints").findOne({
        _id: new ObjectId(complaintId)
      });

      if (!complaint) {
        return res.status(404).json({ message: "Complaint not found." });
      }

      // Check if employee can access this complaint (must be assigned to them or be admin)
      if (requester.role === "employee" && !normalizeAssignedEmployees(complaint.assignedEmployees).includes(requester.userId)) {
        return res.status(403).json({ message: "You don't have access to this complaint." });
      }

      const assignedEmployeeIds = normalizeAssignedEmployees(complaint.assignedEmployees);
      const assignedEmployees = assignedEmployeeIds.length
        ? await getCollection(db, "employees")
            .find({ _id: { $in: assignedEmployeeIds.map((id) => new ObjectId(id)) } })
            .toArray()
        : [];
      const assignedEmployeeNames = assignedEmployeeIds.map(
        (employeeId) => assignedEmployees.find((employee) => employee._id?.toString() === employeeId)?.name ?? "Unknown",
      );

      return res.json({
        id: complaint._id.toString(),
        complaint_id: complaint.complaint_id ?? complaint._id.toString(),
        prn_no: complaint.prn_no,
        farmer_name: complaint.farmer_name,
        phone: complaint.mobile ?? "",
        subject: complaint.subject ?? "",
        complaint: complaint.complaint ?? complaint.issue ?? "",
        image: complaint.image ?? null,
        domain: complaint.complaint_type ?? complaint.subject ?? "General",
        complaint_type: complaint.complaint_type ?? "General",
        district: complaint.district ?? "",
        taluka: complaint.taluka ?? "",
        village: complaint.village ?? "",
        solve_status: complaint.solve_status ?? "Pending",
        solved_by: complaint.solved_by ?? null,
        solved_by_name: complaint.solved_by_name ?? null,
        solved_remark: complaint.solved_remark ?? null,
        registered_by: complaint.registered_by ?? null,
        registered_by_name: complaint.registered_by
          ? (await getCollection(db, "employees").findOne({ _id: new ObjectId(String(complaint.registered_by)) }))?.name ?? "Unknown"
          : "Unknown",
        assignedEmployees: assignedEmployeeIds,
        assignedEmployeeNames,
        created_at: complaint.created_at,
        updated_at: complaint.updated_at ?? complaint.created_at,
        progress: complaint.progress || [
          { date: complaint.created_at, note: "Complaint registered" }
        ],
        resolution_notes: complaint.resolution_notes ?? "",
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: error?.message ?? "Unable to fetch complaint." });
    }
  });

  app.get("/api/stats/admin", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester || requester.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const totalFarmers = await getCollection(db, "Farmers").countDocuments({});
      const totalComplaints = await getCollection(db, "complaints").countDocuments({});
      const pendingComplaints = await getCollection(db, "complaints").countDocuments({ solve_status: { $ne: "Solved" } });
      // Red alert: pending complaints older than 4 days
      const redAlertThresholdDays = 4;
      const redAlertDate = new Date();
      redAlertDate.setDate(redAlertDate.getDate() - redAlertThresholdDays);
      const redAlertComplaints = await getCollection(db, "complaints").countDocuments({
        solve_status: { $ne: "Solved" },
        created_at: { $lt: redAlertDate },
      });
      const outreachSessions = await getCollection(db, "outreach_programmes").countDocuments({});
      const samplingActivities = await getCollection(db, "employee_activities").countDocuments({ activity_type: "sampling" });
      const activeEmployees = await getCollection(db, "employees").countDocuments({ role: "employee" });

      // Farmer distribution by state
      const farmerDistribution = await getCollection(db, "Farmers").aggregate([
        { $group: { _id: "$district", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray();

      const farmerDistData = farmerDistribution.map(item => ({
        state: item._id || "Unknown",
        farmers: item.count
      }));

      // Mock chart data for now but aggregate from DB if needed
      const pieData = [
        { name: "Pending", value: await getCollection(db, "complaints").countDocuments({ solve_status: "Pending" }) },
        { name: "Solved", value: await getCollection(db, "complaints").countDocuments({ solve_status: "Solved" }) },
        { name: "In Progress", value: await getCollection(db, "complaints").countDocuments({ solve_status: "In Progress" }) || 0 },
      ];

      // Monthly aggregation for the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const monthlyData = await getCollection(db, "complaints").aggregate([
        { $match: { created_at: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              month: { $month: "$created_at" },
              year: { $year: "$created_at" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]).toArray();

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const chartData = [];
      for(let i = 0; i < 6; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          const m = d.getMonth() + 1;
          const y = d.getFullYear();
          const match = monthlyData.find(md => md._id.month === m && md._id.year === y);
          chartData.push({
              month: monthNames[m-1],
              complaints: match ? match.count : 0
          });
      }

      return res.json({
        totalFarmers,
        totalComplaints,
        pendingComplaints,
        outreachSessions,
        samplingActivities,
        activeEmployees,
        farmerDistribution: farmerDistData,
        pieData,
        chartData
      });

    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Admin Sampling Data
  app.get("/api/admin/sampling-data", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester || requester.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const mapFeedback = getCollection(db, "map_feedback");
      const employees = getCollection(db, "employees");

      const rows = await mapFeedback
        .find({})
        .sort({ created_at: -1 })
        .toArray();

      const employeeIds = rows
        .map((row) => String((row as any).employee_id ?? ""))
        .filter(Boolean)
        .filter((value, index, arr) => arr.indexOf(value) === index)
        .filter((value) => ObjectId.isValid(value))
        .map((value) => new ObjectId(value));

      const employeeRows = employeeIds.length
        ? await employees.find({ _id: { $in: employeeIds } }).toArray()
        : [];

      const employeeNameMap = new Map<string, string>(
        employeeRows.map((row) => [row._id?.toString() ?? "", row.name]),
      );

      const enriched = rows.map((row) => {
        const mapImages = [
          (row as any).ndvi_image,
          (row as any).evi_image,
          (row as any).crop_image,
          (row as any).water_image,
          (row as any).growth_image,
          (row as any).vra_image,
          (row as any).mmc_image,
          (row as any).fasal_image,
        ].filter((value) => typeof value === "string" && value.trim().length > 0);

        return {
          _id: row._id?.toString(),
          employee_id: (row as any).employee_id,
          employee_name:
            (row as any).employee_name ||
            employeeNameMap.get(String((row as any).employee_id ?? "")) ||
            "Unknown",
          activity_type: "sampling",
          date: (row as any).plantation_date || row.created_at,
          location: [
            (row as any).village,
            (row as any).taluka,
            (row as any).district,
          ]
            .filter(Boolean)
            .join(", "),
          description: (row as any).remark || `Sampling record for ${(row as any).farmer_name || "Unknown farmer"}`,
          prn: (row as any).prn,
          farmer_name: (row as any).farmer_name,
          map_images: mapImages,
          map_image_count: mapImages.length,
          created_at: row.created_at,
        };
      });

      return res.json({ sampling: enriched });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Admin Farmer Location Data for Map
  app.get("/api/admin/farmer-locations", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester || requester.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const farmers = getCollection(db, "Farmers");

      // Aggregate farmer counts by location hierarchy
      const locationData = await farmers.aggregate([
        {
          $group: {
            _id: {
              state: "$state",
              district: "$district",
              taluka: "$taluka",
              village: "$village"
            },
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            state: "$_id.state",
            district: "$_id.district",
            taluka: "$_id.taluka",
            village: "$_id.village",
            count: 1
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();

      // Add approximate coordinates for Indian locations (in production, use a geocoding service)
      const locationCoordinates: Record<string, { lat: number; lng: number }> = {
        // Maharashtra
        "Pune": { lat: 18.5204, lng: 73.8567 },
        "Mumbai": { lat: 19.0760, lng: 72.8777 },
        "Nagpur": { lat: 21.1458, lng: 79.0882 },
        // Gujarat
        "Ahmedabad": { lat: 23.0225, lng: 72.5714 },
        "Surat": { lat: 21.1702, lng: 72.8311 },
        "Vadodara": { lat: 22.3072, lng: 73.1812 },
        // Rajasthan
        "Jaipur": { lat: 26.9124, lng: 75.7873 },
        "Jodhpur": { lat: 26.2389, lng: 73.0243 },
        "Udaipur": { lat: 24.5854, lng: 73.7125 },
        // Madhya Pradesh
        "Bhopal": { lat: 23.2599, lng: 77.4126 },
        "Indore": { lat: 22.7196, lng: 75.8577 },
        "Jabalpur": { lat: 23.1815, lng: 79.9864 },
        // Uttar Pradesh
        "Lucknow": { lat: 26.8467, lng: 80.9462 },
        "Kanpur": { lat: 26.4499, lng: 80.3319 },
        "Varanasi": { lat: 25.3176, lng: 82.9739 },
        // Karnataka
        "Bangalore": { lat: 12.9716, lng: 77.5946 },
        "Mysore": { lat: 12.2958, lng: 76.6394 },
        "Hubli": { lat: 15.3647, lng: 75.1240 },
      };

      const enrichedData = locationData.map((item: any) => ({
        ...item,
        lat: locationCoordinates[item.district]?.lat || 20.5937, // Default to center of India
        lng: locationCoordinates[item.district]?.lng || 78.9629,
      }));

      return res.json({ locations: enrichedData });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/employees-with-stats", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester || requester.role !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const employees = await getCollection(db, "employees").find({ role: "employee" }).toArray();
      const complaints = getCollection(db, "complaints");
      const activities = getCollection(db, "employee_activities");

      const enriched = await Promise.all(employees.map(async emp => {
          const empId = emp._id.toString();
          const activeComplaints = await complaints.countDocuments({ assignedEmployees: empId, solve_status: { $ne: "Solved" } });
          const workVisit = await activities.countDocuments({ employee_id: empId, activity_type: "field_visit" });
          const randomSampling = await activities.countDocuments({ employee_id: empId, activity_type: "sampling" });
          const outreachConducted = await activities.countDocuments({ employee_id: empId, activity_type: { $in: ["expert_session", "OUTREACH_CONDUCTED"] } });
          const outreachAttended = await activities.countDocuments({ employee_id: empId, activity_type: "OUTREACH_ATTENDED" });
          const outreach = outreachConducted + outreachAttended;
          
          const assignedList = await complaints.find({ assignedEmployees: empId }).limit(10).toArray();

          return {
              id: empId,
              name: emp.name,
              email: emp.email,
              contact: emp.contact ?? "-",
              dob: emp.dob ?? "",
              gender: emp.gender ?? "",
              domain: emp.domain ?? emp.domain_expertise ?? "",
              address: emp.address ?? "",
              profile_photo: emp.profile_photo ?? null,
              profile_photo_updated_at: emp.profile_photo_updated_at ?? null,
              role: emp.role,
              created_at: emp.created_at,
              activeComplaints,
              workVisit,
              randomSampling,
              outreach,
              complaintsAssigned: assignedList.map(c => ({
                  id: c._id.toString(),
                  status: c.solve_status,
                  domain: c.complaint_type || "General"
              }))
          };
      }));

      return res.json({ employees: enriched });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stats/employee", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const userId = requester.userId;

      const assignedTasks = await getCollection(db, "complaints").countDocuments({ assignedEmployees: userId, solve_status: { $ne: "Solved" } });
      const visitsCompleted = await getCollection(db, "employee_activities").countDocuments({ employee_id: userId, activity_type: "field_visit" });
      const sessionsHostedConducted = await getCollection(db, "employee_activities").countDocuments({ employee_id: userId, activity_type: { $in: ["expert_session", "OUTREACH_CONDUCTED"] } });
      const sessionsHostedAttended = await getCollection(db, "employee_activities").countDocuments({ employee_id: userId, activity_type: "OUTREACH_ATTENDED" });
      const sessionsHosted = sessionsHostedConducted + sessionsHostedAttended;
      const dataSamplings = await getCollection(db, "employee_activities").countDocuments({ employee_id: userId, activity_type: "sampling" });

      return res.json({
        assignedTasks,
        visitsCompleted,
        sessionsHosted,
        dataSamplings
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });

  // Field Visit Helpers
  function extractFieldVisitFields(body: any) {
    // Use a flexible record type for field extraction to avoid strict type constraints.
    const fields: Record<string, any> = {};

    const setString = (key: keyof FieldVisitDocument, val: any) => {
      if (val !== undefined) {
        // Use a type‑unsafe assignment to bypass strict field type constraints.
        (fields as any)[key] = val === null ? "" : String(val).trim();
      }
    };

    setString("prn", body.prn);
    setString("farmer_name", body.farmer_name);
    setString("visit_date", body.visit_date);
    setString("district", body.district);
    setString("taluka", body.taluka);
    setString("village", body.village);
    setString("soil_condition", body.soil_condition);
    setString("soil_temp", body.soil_temp);
    setString("soil_moisture", body.soil_moisture);
    setString("irrigation", body.irrigation);
    setString("fertilizer", body.fertilizer);
    setString("deficiency", body.deficiency);
    setString("pest_attack", body.pest_attack);
    setString("disease_symptoms", body.disease_symptoms);
    setString("disease_image", body.disease_image);
    setString("krushik", body.krushik);
    setString("reason", body.reason);
    setString("spray", body.spray);
    setString("health", body.health);
    setString("germination", body.germination);
    setString("tillers", body.tillers);
    setString("height", body.height);
    setString("girth", body.girth);
    setString("geo_tag_image", body.geo_tag_image);
    setString("observations", body.observations);
    setString("remark", body.remark);

    // New fields
    setString("planting_date", body.planting_date);
    setString("harvesting_date", body.harvesting_date);
    setString("area", body.area);
    setString("rainfall_last_week", body.rainfall_last_week);
    setString("rainfall_last_week_qty", body.rainfall_last_week_qty);
    setString("irrigation_advisories", body.irrigation_advisories);
    setString("last_irrigation_date", body.last_irrigation_date);
    setString("irrigation_advisories_useful", body.irrigation_advisories_useful);
    setString("irrigation_advisories_remark", body.irrigation_advisories_remark);
    setString("irrigation_method", body.irrigation_method);
    setString("soil_moisture_match", body.soil_moisture_match);
    setString("iot_sensor_working", body.iot_sensor_working);
    setString("fertilizer_advisories", body.fertilizer_advisories);
    setString("follow_fertilizer_advisory", body.follow_fertilizer_advisory);
    setString("applied_fertilizer_recently", body.applied_fertilizer_recently);
    setString("fertilizer_type", body.fertilizer_type);
    setString("fertilizer_quantity", body.fertilizer_quantity);
    setString("fertilizer_application_date", body.fertilizer_application_date);
    setString("nutrient_deficiency", body.nutrient_deficiency);
    setString("nutrient_deficiency_image", body.nutrient_deficiency_image);
    setString("pest_disease_alerts", body.pest_disease_alerts);
    setString("pest_disease_observed_name", body.pest_disease_observed_name);
    setString("pest_disease_image", body.pest_disease_image);
    setString("pest_disease_alerts_useful", body.pest_disease_alerts_useful);
    setString("pest_attack_name", body.pest_attack_name);
    setString("pest_attack_image", body.pest_attack_image);
    setString("disease_observed", body.disease_observed);
    setString("disease_name", body.disease_name);
    setString("last_spray_date", body.last_spray_date);
    setString("spray_type", body.spray_type);
    setString("spray_dosage", body.spray_dosage);
    setString("spray_challenges", body.spray_challenges);
    setString("spray_challenges_remark", body.spray_challenges_remark);
    setString("vegetative_maps_displayed", body.vegetative_maps_displayed);
    setString("crop_health_maps_match", body.crop_health_maps_match);
    setString("crop_health_maps_match_remark", body.crop_health_maps_match_remark);
    setString("ai_recommendations_satisfaction", body.ai_recommendations_satisfaction);

    // Point A
    setString("point_a_tillers", body.point_a_tillers);
    setString("point_a_height", body.point_a_height);
    setString("point_a_girth", body.point_a_girth);
    setString("point_a_green_leaves", body.point_a_green_leaves);
    setString("point_a_geo_tag_image", body.point_a_geo_tag_image);
    setString("point_a_scale_image", body.point_a_scale_image);

    // Point B
    setString("point_b_tillers", body.point_b_tillers);
    setString("point_b_height", body.point_b_height);
    setString("point_b_girth", body.point_b_girth);
    setString("point_b_green_leaves", body.point_b_green_leaves);
    setString("point_b_geo_tag_image", body.point_b_geo_tag_image);
    setString("point_b_scale_image", body.point_b_scale_image);

    // Point C
    setString("point_c_tillers", body.point_c_tillers);
    setString("point_c_height", body.point_c_height);
    setString("point_c_girth", body.point_c_girth);
    setString("point_c_green_leaves", body.point_c_green_leaves);
    setString("point_c_geo_tag_image", body.point_c_geo_tag_image);
    setString("point_c_scale_image", body.point_c_scale_image);

    // Section J/K/L
    setString("crop_health_condition", body.crop_health_condition);
    setString("app_benefits", body.app_benefits);
    setString("app_challenges", body.app_challenges);
    setString("app_suggestions", body.app_suggestions);
    setString("farmer_observations", body.farmer_observations);

    if (body.nutrient_deficiency_type !== undefined) {
      if (Array.isArray(body.nutrient_deficiency_type)) {
        fields.nutrient_deficiency_type = body.nutrient_deficiency_type;
      } else {
        fields.nutrient_deficiency_type = String(body.nutrient_deficiency_type).trim();
      }
    }

    // Smart sync
    if (!fields.point_a_tillers && fields.tillers) fields.point_a_tillers = fields.tillers;
    if (!fields.tillers && fields.point_a_tillers) fields.tillers = fields.point_a_tillers;

    if (!fields.point_a_height && fields.height) fields.point_a_height = fields.height;
    if (!fields.height && fields.point_a_height) fields.height = fields.point_a_height;

    if (!fields.point_a_girth && fields.girth) fields.point_a_girth = fields.girth;
    if (!fields.girth && fields.point_a_girth) fields.girth = fields.point_a_girth;

    if (!fields.point_a_geo_tag_image && fields.geo_tag_image) fields.point_a_geo_tag_image = fields.geo_tag_image;
    if (!fields.geo_tag_image && fields.point_a_geo_tag_image) fields.geo_tag_image = fields.point_a_geo_tag_image;

    if (!fields.disease_image && fields.pest_disease_image) fields.disease_image = fields.pest_disease_image;
    if (!fields.pest_disease_image && fields.disease_image) fields.pest_disease_image = fields.disease_image;

    return fields;
  }

  // Field Visit Endpoints
  app.post("/api/field-visits", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const prn = String(req.body?.prn ?? "").trim();
      const farmer_name = String(req.body?.farmer_name ?? "").trim();
      const visit_date = String(req.body?.visit_date ?? "").trim();

      if (!prn || !farmer_name || !visit_date) {
        return res.status(400).json({ message: "PRN, farmer name and visit date are required." });
      }

      const db = await getDb();
      const fieldVisitsCollection = getCollection(db, "field_visits");

      const extractedFields = extractFieldVisitFields(req.body);
      const insertDoc: FieldVisitDocument = {
        ...extractedFields,
        employee_id: requester.userId,
        employee_name: requester.email,
        created_at: new Date(),
      };

      const insert = await fieldVisitsCollection.insertOne(insertDoc);

      const village = insertDoc.village ?? "";
      const taluka = insertDoc.taluka ?? "";
      const district = insertDoc.district ?? "";

      try {
        await getCollection(db, "employee_activities").insertOne({
          employee_id: requester.userId,
          activity_type: "field_visit",
          date: visit_date ? new Date(visit_date) : new Date(),
          location: [village, taluka, district].filter(Boolean).join(", "),
          description: `Field visit recorded for ${farmer_name} (${prn})`,
          created_at: new Date(),
        } as EmployeeActivityDocument);
      } catch (activityError) {
        console.warn("Unable to create linked field_visit activity:", activityError);
      }

      return res.status(201).json({
        message: "Field visit recorded successfully.",
        field_visit: {
          id: insert.insertedId.toString(),
          employee_id: insertDoc.employee_id,
          employee_name: insertDoc.employee_name,
          prn,
          farmer_name,
          visit_date,
          disease_image: insertDoc.disease_image,
          geo_tag_image: insertDoc.geo_tag_image,
          created_at: insertDoc.created_at,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to create field visit." });
    }
  });

  app.get("/api/field-visits", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const fieldVisits = getCollection(db, "field_visits");

      const filter: Record<string, unknown> = {};
      if (requester.role === "employee") {
        filter.employee_id = requester.userId;
      }

      const rows = await fieldVisits.find(filter).sort({ created_at: -1 }).toArray();

      return res.json({
        field_visits: rows.map((row) => {
          const { _id, ...rest } = row;
          return {
            id: _id?.toString(),
            ...rest
          };
        }),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to fetch field visits." });
    }
  });

  app.get("/api/field-visits/:id", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const fieldVisits = getCollection(db, "field_visits");

      let objId;
      try {
        objId = new ObjectId(req.params.id);
      } catch (err) {
        return res.status(400).json({ message: "Invalid ID format." });
      }

      const visit = await fieldVisits.findOne({ _id: objId });
      if (!visit) {
        return res.status(404).json({ message: "Field visit not found." });
      }

      if (requester.role === "employee" && visit.employee_id !== requester.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { _id, ...rest } = visit;
      return res.json({
        id: _id?.toString(),
        ...rest
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to fetch field visit." });
    }
  });

  app.put("/api/field-visits/:id", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const fieldVisits = getCollection(db, "field_visits");

      let objId;
      try {
        objId = new ObjectId(req.params.id);
      } catch (err) {
        return res.status(400).json({ message: "Invalid ID format." });
      }

      const visit = await fieldVisits.findOne({ _id: objId });
      if (!visit) {
        return res.status(404).json({ message: "Field visit not found." });
      }

      if (requester.role === "employee" && visit.employee_id !== requester.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const extractedFields = extractFieldVisitFields(req.body);
      
      const updateResult = await fieldVisits.updateOne(
        { _id: objId },
        { $set: extractedFields }
      );

      return res.json({
        message: "Field visit updated successfully.",
        modifiedCount: updateResult.modifiedCount
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to update field visit." });
    }
  });

  app.patch("/api/field-visits/:id", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const fieldVisits = getCollection(db, "field_visits");

      let objId;
      try {
        objId = new ObjectId(req.params.id);
      } catch (err) {
        return res.status(400).json({ message: "Invalid ID format." });
      }

      const visit = await fieldVisits.findOne({ _id: objId });
      if (!visit) {
        return res.status(404).json({ message: "Field visit not found." });
      }

      if (requester.role === "employee" && visit.employee_id !== requester.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const extractedFields = extractFieldVisitFields(req.body);
      
      const updateResult = await fieldVisits.updateOne(
        { _id: objId },
        { $set: extractedFields }
      );

      return res.json({
        message: "Field visit updated successfully.",
        modifiedCount: updateResult.modifiedCount
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to patch field visit." });
    }
  });

  // Map Feedback Endpoints
  app.post("/api/map-feedback", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const prn = String(req.body?.prn ?? "").trim();
      const farmer_name = String(req.body?.farmer_name ?? "").trim();
      const mobile = String(req.body?.mobile ?? "").trim();
      const plantation_date = String(req.body?.plantation_date ?? "").trim();
      const district = String(req.body?.district ?? "").trim();
      const taluka = String(req.body?.taluka ?? "").trim();
      const village = String(req.body?.village ?? "").trim();

      if (!prn || !farmer_name || !mobile || !plantation_date) {
        return res.status(400).json({ message: "PRN, farmer name, mobile and plantation date are required." });
      }

      if (!/^[0-9]{10}$/.test(mobile)) {
        return res.status(400).json({ message: "Mobile number must be exactly 10 digits." });
      }

      const db = await getDb();
      const mapFeedbackCollection = getCollection(db, "map_feedback");

      // Extract map feedback data
      const mapKeys = ["ndvi", "evi", "crop_stress", "water_watch", "early_growth", "vra", "mmc", "fasal"];
      const mapData: Record<string, any> = {};

      for (const key of mapKeys) {
        const interpretation = String(req.body?.maps?.[key]?.interpretation ?? "").trim();
        const feedback = String(req.body?.maps?.[key]?.feedback ?? "").trim();
        const image = String(req.body?.maps?.[key]?.image ?? "").trim();
        mapData[`${key}_image`] = image;
        mapData[`${key}_interpretation`] = interpretation;
        mapData[`${key}_feedback`] = feedback;
      }

      const insertDoc: MapFeedbackDocument = {
        employee_id: requester.userId,
        employee_name: requester.email,
        prn,
        farmer_name,
        mobile,
        plantation_date,
        district,
        taluka,
        village,
        ndvi_image: mapData.ndvi_image,
        ndvi_interpretation: mapData.ndvi_interpretation,
        ndvi_feedback: mapData.ndvi_feedback,
        evi_image: mapData.evi_image,
        evi_interpretation: mapData.evi_interpretation,
        evi_feedback: mapData.evi_feedback,
        crop_image: mapData.crop_stress_image,
        crop_interpretation: mapData.crop_stress_interpretation,
        crop_feedback: mapData.crop_stress_feedback,
        water_image: mapData.water_watch_image,
        water_interpretation: mapData.water_watch_interpretation,
        water_feedback: mapData.water_watch_feedback,
        growth_image: mapData.early_growth_image,
        growth_interpretation: mapData.early_growth_interpretation,
        growth_feedback: mapData.early_growth_feedback,
        vra_image: mapData.vra_image,
        vra_interpretation: mapData.vra_interpretation,
        vra_feedback: mapData.vra_feedback,
        mmc_image: mapData.mmc_image,
        mmc_interpretation: mapData.mmc_interpretation,
        mmc_feedback: mapData.mmc_feedback,
        fasal_image: mapData.fasal_image,
        fasal_interpretation: mapData.fasal_interpretation,
        fasal_feedback: mapData.fasal_feedback,
        remark: String(req.body?.remark ?? "").trim(),
        created_at: new Date(),
      };

      const insert = await mapFeedbackCollection.insertOne(insertDoc);

      try {
        await getCollection(db, "employee_activities").insertOne({
          employee_id: requester.userId,
          activity_type: "sampling",
          date: plantation_date ? new Date(plantation_date) : new Date(),
          location: [village, taluka, district].filter(Boolean).join(", "),
          description: `Random sampling feedback submitted for ${farmer_name} (${prn})`,
          created_at: new Date(),
        } as EmployeeActivityDocument);
      } catch (activityError) {
        console.warn("Unable to create linked sampling activity:", activityError);
      }

      return res.status(201).json({
        message: "Map feedback submitted successfully.",
        map_feedback: {
          id: insert.insertedId.toString(),
          employee_id: insertDoc.employee_id,
          employee_name: insertDoc.employee_name,
          prn,
          farmer_name,
          plantation_date,
          created_at: insertDoc.created_at,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to create map feedback." });
    }
  });

  app.get("/api/map-feedback", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const mapFeedback = getCollection(db, "map_feedback");

      const filter: Record<string, unknown> = {};
      if (requester.role === "employee") {
        filter.employee_id = requester.userId;
      }

      const rows = await mapFeedback.find(filter).sort({ created_at: -1 }).toArray();

      return res.json({
        map_feedback: rows.map((row) => ({
          id: row._id?.toString(),
          employee_id: row.employee_id,
          employee_name: row.employee_name,
          prn: row.prn,
          farmer_name: row.farmer_name,
          mobile: row.mobile,
          plantation_date: row.plantation_date,
          district: row.district,
          taluka: row.taluka,
          village: row.village,
          ndvi_image: row.ndvi_image,
          evi_image: row.evi_image,
          crop_image: row.crop_image,
          water_image: row.water_image,
          growth_image: row.growth_image,
          vra_image: row.vra_image,
          mmc_image: row.mmc_image,
          fasal_image: row.fasal_image,
          remark: row.remark,
          created_at: row.created_at,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to fetch map feedback." });
    }
  });

    type OutreachSectionType = "conducted" | "attended";

    type OutreachDocumentAttachment = {
      name: string;
      url: string;
    };

    function normalizeOutreachType(value: unknown): OutreachSectionType | null {
      const normalized = String(value ?? "").trim().toLowerCase();
      if (normalized === "conducted" || normalized === "attended") {
        return normalized;
      }
      return null;
    }

    function normalizeString(value: unknown) {
      return String(value ?? "").trim();
    }

    function normalizeStringArray(value: unknown) {
      if (!Array.isArray(value)) return [] as string[];
      return value.map((item) => normalizeString(item)).filter((item) => item.length > 0);
    }

    function normalizeDocuments(value: unknown): OutreachDocumentAttachment[] {
      if (!Array.isArray(value)) return [];

      return value
        .map((item) => {
          if (typeof item === "string") {
            const url = normalizeString(item);
            if (!url) return null;
            return { name: url.split("/").pop() || "Document", url };
          }

          const url = normalizeString((item as any)?.url ?? (item as any)?.href);
          if (!url) return null;

          return {
            name: normalizeString((item as any)?.name ?? (item as any)?.label) || url.split("/").pop() || "Document",
            url,
          };
        })
        .filter((item): item is OutreachDocumentAttachment => Boolean(item));
    }

    function parseGeoNumber(value: unknown) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function mapOutreachResponse(row: any) {
      const outreachType = normalizeOutreachType(row.outreach_type ?? row.section_type) ?? "conducted";
      const supportingDocuments = normalizeDocuments(row.supporting_documents);
      const legacyPhotos = Array.isArray(row.photos) ? row.photos.filter((item: unknown) => Boolean(normalizeString(item))) : [];
      const geoTaggedPhoto = normalizeString(row.geo_tagged_photo) || normalizeString(legacyPhotos[0]);

      return {
        id: row._id?.toString() ?? "",
        employee_id: row.employee_id ?? "",
        employee_name: row.employee_name ?? "",
        created_by: row.created_by ?? row.employee_id ?? "",
        outreach_type: outreachType,
        section_type: outreachType,
        program_title: row.program_title ?? row.location ?? "",
        program_type: row.program_type ?? row.agronomist_specialist ?? "",
        organizer: row.organizer ?? row.instructor ?? "",
        role: row.role ?? "",
        date: row.date ?? "",
        location: row.location ?? "",
        remarks: row.remarks ?? "",
        key_learning: row.key_learning ?? "",
        detailed_report: row.detailed_report ?? "",
        supporting_documents: supportingDocuments,
        geo_tagged_photo: geoTaggedPhoto,
        additional_program_photos: normalizeStringArray(row.additional_program_photos).length
          ? normalizeStringArray(row.additional_program_photos)
          : legacyPhotos.slice(1),
        certificate: row.certificate ?? "",
        employee_id: row.employee_id ?? "",
        employee_name: row.employee_name ?? "",
        created_date: row.created_date ?? row.created_at ?? null,
        last_updated: row.last_updated ?? row.updated_at ?? null,
        geo_latitude: parseGeoNumber(row.geo_latitude),
        geo_longitude: parseGeoNumber(row.geo_longitude),
        geo_location_label: row.geo_location_label ?? row.location ?? "",
        district: row.district ?? "",
        taluka: row.taluka ?? "",
        village: row.village ?? "",
        duration: row.duration,
        photos: legacyPhotos,
        agronomist_specialist: row.agronomist_specialist ?? "",
        no_of_people: row.no_of_people,
        instructor: row.instructor ?? "",
      };
    }

  // Outreach Programme APIs
  app.post("/api/outreach", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin" && requester.role !== "employee") {
        return res.status(403).json({ message: "Only admin or employee can create outreach records." });
      }

      const outreachType = normalizeOutreachType(req.body?.outreach_type ?? req.body?.section_type);
      const programTitle = normalizeString(req.body?.program_title ?? req.body?.location);
      const location = normalizeString(req.body?.location);
      const date = normalizeString(req.body?.date);
      const employeeDb = await getCollection((await getDb()), "employees").findOne({ _id: new ObjectId(requester.userId) });
      const employeeName = normalizeString(req.body?.employee_name) || employeeDb?.name || "Unknown";
      const supportingDocuments = normalizeDocuments(req.body?.supporting_documents);
      const legacyPhotos = Array.isArray(req.body?.photos) ? normalizeStringArray(req.body.photos) : [];
      const geoTaggedPhoto = normalizeString(req.body?.geo_tagged_photo) || legacyPhotos[0] || "";
      const additionalProgramPhotos = normalizeStringArray(req.body?.additional_program_photos).length
        ? normalizeStringArray(req.body?.additional_program_photos)
        : legacyPhotos.slice(1).slice(0, 3);
      const geoLatitude = parseGeoNumber(req.body?.geo_latitude ?? req.body?.latitude ?? req.body?.lat);
      const geoLongitude = parseGeoNumber(req.body?.geo_longitude ?? req.body?.longitude ?? req.body?.lng);
      const geoLocationLabel = normalizeString(req.body?.geo_location_label ?? req.body?.geo_location ?? location);
      const programType = normalizeString(req.body?.program_type ?? req.body?.agronomist_specialist ?? req.body?.collaborator);
      const organizer = normalizeString(req.body?.organizer ?? req.body?.instructor);
      const role = normalizeString(req.body?.role ?? req.body?.participant_role);
      const remarks = normalizeString(req.body?.remarks);
      const keyLearning = normalizeString(req.body?.key_learning);
      const detailedReport = normalizeString(req.body?.detailed_report);
      const certificate = normalizeString(req.body?.certificate);
      const district = normalizeString(req.body?.district);
      const taluka = normalizeString(req.body?.taluka);
      const village = normalizeString(req.body?.village);
      const duration = req.body?.duration !== undefined && req.body?.duration !== null && req.body?.duration !== "" ? Number(req.body.duration) : undefined;
      const noOfPeople = req.body?.no_of_people !== undefined && req.body?.no_of_people !== null && req.body?.no_of_people !== "" ? Number(req.body.no_of_people) : undefined;

      if (!outreachType) {
        return res.status(400).json({ message: "outreach_type is required and must be conducted or attended." });
      }

      if (!programTitle) {
        return res.status(400).json({ message: "Program title is required." });
      }

      if (!location) {
        return res.status(400).json({ message: "Location is required." });
      }

      if (!date) {
        return res.status(400).json({ message: "Date is required." });
      }

      if (!geoTaggedPhoto) {
        return res.status(400).json({ message: "A geo-tagged photo is required." });
      }

      if (outreachType === "conducted") {
        if (!programType) {
          return res.status(400).json({ message: "Program type is required for conducted programs." });
        }
      } else if (outreachType === "attended") {
        if (!organizer) {
          return res.status(400).json({ message: "Organizer is required for attended programs." });
        }
        if (!role) {
          return res.status(400).json({ message: "Role is required for attended programs." });
        }
      }

      const createdDate = new Date();
      const outreachRecord: OutreachProgrammeDocument = {
        employee_id: requester.userId,
        employee_name: employeeName,
        created_by: requester.userId,
        outreach_type: outreachType,
        section_type: outreachType,
        program_title: programTitle,
        program_type: outreachType === "conducted" ? programType : undefined,
        organizer: outreachType === "attended" ? organizer : undefined,
        role: outreachType === "attended" ? role : undefined,
        location,
        date,
        remarks,
        key_learning: keyLearning,
        detailed_report: detailedReport,
        supporting_documents: supportingDocuments,
        geo_tagged_photo: geoTaggedPhoto,
        additional_program_photos: additionalProgramPhotos.slice(0, 3),
        certificate: outreachType === "attended" ? certificate : undefined,
        geo_latitude: geoLatitude,
        geo_longitude: geoLongitude,
        geo_location_label: geoLocationLabel,
        district,
        taluka,
        village,
        duration,
        photos: [geoTaggedPhoto, ...additionalProgramPhotos].filter((item) => item.length > 0),
        agronomist_specialist: programType,
        no_of_people: noOfPeople,
        instructor: organizer,
        created_at: createdDate,
        created_date: createdDate,
        updated_at: createdDate,
        last_updated: createdDate,
      };

      const db = await getDb();
      const outreach = getCollection(db, "outreach_programmes");
      const result = await outreach.insertOne(outreachRecord);

      try {
        await getCollection(db, "employee_activities").insertOne({
          employee_id: requester.userId,
          activity_type: outreachType === "conducted" ? "OUTREACH_CONDUCTED" : "OUTREACH_ATTENDED",
          date: new Date(date),
          location,
          description:
            outreachType === "conducted"
              ? `Outreach conducted at ${programTitle}`
              : `Outreach attended at ${programTitle}`,
          created_at: new Date(),
        } as EmployeeActivityDocument);
      } catch (activityError) {
        console.warn("Unable to create linked outreach activity:", activityError);
      }

      const created = await outreach.findOne({ _id: result.insertedId });

      return res.status(201).json({
        message: "Outreach record created successfully.",
        outreach: mapOutreachResponse(created),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to create outreach record." });
    }
  });

  app.get("/api/outreach", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const db = await getDb();
      const outreach = getCollection(db, "outreach_programmes");

      const baseFilter: Record<string, unknown> = requester.role === "employee" ? { employee_id: requester.userId } : {};
      const rows = await outreach.find(baseFilter).sort({ created_at: -1, created_date: -1 }).toArray();

      const search = normalizeString(req.query.search ?? req.query.q);
      const dateFilter = normalizeString(req.query.date);
      const programTypeFilter = normalizeString(req.query.program_type ?? req.query.programType);
      const employeeFilter = normalizeString(req.query.employee_id ?? req.query.employeeId ?? req.query.employee);
      const outreachTypeFilter = normalizeOutreachType(req.query.outreach_type ?? req.query.section_type);

      const filtered = rows
        .map((row) => mapOutreachResponse(row))
        .filter((row) => {
          const matchesSearch =
            !search ||
            row.program_title.toLowerCase().includes(search.toLowerCase()) ||
            row.location.toLowerCase().includes(search.toLowerCase()) ||
            row.employee_name.toLowerCase().includes(search.toLowerCase()) ||
            row.remarks.toLowerCase().includes(search.toLowerCase()) ||
            row.key_learning.toLowerCase().includes(search.toLowerCase()) ||
            row.organizer.toLowerCase().includes(search.toLowerCase());

          const matchesDate = !dateFilter || String(row.date).startsWith(dateFilter);
          const matchesProgramType = !programTypeFilter || row.program_type.toLowerCase() === programTypeFilter.toLowerCase();
          const matchesEmployee =
            !employeeFilter ||
            row.employee_id === employeeFilter ||
            row.employee_name.toLowerCase().includes(employeeFilter.toLowerCase());
          const matchesOutreachType = !outreachTypeFilter || row.outreach_type === outreachTypeFilter;

          return matchesSearch && matchesDate && matchesProgramType && matchesEmployee && matchesOutreachType;
        });

      return res.json({
        outreach: filtered,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to fetch outreach records." });
    }
  });

  app.get("/api/outreach/employee/:employeeId", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const employeeId = String(req.params.employeeId ?? "").trim();
      if (!employeeId) {
        return res.status(400).json({ message: "employeeId is required." });
      }

      if (requester.role !== "admin" && requester.userId !== employeeId) {
        // Also allow if employeeId is the custom employee_id for the same user
        const db2 = await getDb();
        const emp2 = await getCollection(db2, "employees").findOne({ _id: new ObjectId(requester.userId) });
        const customId = emp2?.employee_id ?? "";
        if (customId !== employeeId) {
          return res.status(403).json({ message: "You can only view your own outreach records." });
        }
      }

      const db = await getDb();
      const outreach = getCollection(db, "outreach_programmes");

      // employee_id in outreach docs is always the MongoDB _id string (requester.userId).
      // The client may pass either the employee_id field (E-001) or the _id string.
      // Resolve to the actual _id string first.
      let resolvedId = employeeId;
      if (!ObjectId.isValid(employeeId)) {
        // It's a custom employee_id like "E-001" — look up the actual _id
        const emp = await getCollection(db, "employees").findOne({ employee_id: employeeId });
        if (emp) {
          resolvedId = emp._id.toString();
        }
      }

      const rows = await outreach.find({ employee_id: resolvedId }).sort({ created_at: -1, created_date: -1 }).toArray();

      return res.json({
        outreach: rows.map((row) => mapOutreachResponse(row)),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          message:
            error?.message ?? "Unable to fetch employee outreach records.",
        });
    }
  });

  app.put("/api/outreach/:id", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const outreachId = String(req.params.id ?? "").trim();
      if (!outreachId || !ObjectId.isValid(outreachId)) {
        return res.status(400).json({ message: "Valid ID is required." });
      }

      const db = await getDb();
      const outreach = getCollection(db, "outreach_programmes");
      const existing = await outreach.findOne({
        _id: new ObjectId(outreachId),
      });

      if (!existing) {
        return res.status(404).json({ message: "Outreach record not found." });
      }

      if (
        existing.employee_id !== requester.userId &&
        requester.role !== "admin"
      ) {
        return res
          .status(403)
          .json({
            message: "You can only edit your own records or admin can edit any.",
          });
      }

      const existingType = normalizeOutreachType(existing.outreach_type ?? existing.section_type) ?? "conducted";
      const nextType = normalizeOutreachType(req.body?.outreach_type ?? req.body?.section_type) ?? existingType;
      const now = new Date();
      const updateData: Partial<OutreachProgrammeDocument> = {
        updated_at: now,
        last_updated: now,
      };

      if (req.body?.program_title !== undefined) updateData.program_title = normalizeString(req.body.program_title);
      if (req.body?.location !== undefined) updateData.location = normalizeString(req.body.location);
      if (req.body?.date !== undefined) updateData.date = normalizeString(req.body.date);
      if (req.body?.remarks !== undefined) updateData.remarks = normalizeString(req.body.remarks);
      if (req.body?.key_learning !== undefined) updateData.key_learning = normalizeString(req.body.key_learning);
      if (req.body?.detailed_report !== undefined) updateData.detailed_report = normalizeString(req.body.detailed_report);
      if (req.body?.certificate !== undefined) updateData.certificate = normalizeString(req.body.certificate);
      if (req.body?.district !== undefined) updateData.district = normalizeString(req.body.district);
      if (req.body?.taluka !== undefined) updateData.taluka = normalizeString(req.body.taluka);
      if (req.body?.village !== undefined) updateData.village = normalizeString(req.body.village);
      if (req.body?.duration !== undefined) updateData.duration = req.body.duration === "" ? undefined : Number(req.body.duration);
      if (req.body?.geo_latitude !== undefined || req.body?.latitude !== undefined || req.body?.lat !== undefined) {
        updateData.geo_latitude = parseGeoNumber(req.body?.geo_latitude ?? req.body?.latitude ?? req.body?.lat);
      }
      if (req.body?.geo_longitude !== undefined || req.body?.longitude !== undefined || req.body?.lng !== undefined) {
        updateData.geo_longitude = parseGeoNumber(req.body?.geo_longitude ?? req.body?.longitude ?? req.body?.lng);
      }
      if (req.body?.geo_location_label !== undefined || req.body?.geo_location !== undefined) {
        updateData.geo_location_label = normalizeString(req.body?.geo_location_label ?? req.body?.geo_location);
      }

      const documents = req.body?.supporting_documents !== undefined ? normalizeDocuments(req.body.supporting_documents) : undefined;
      if (documents) updateData.supporting_documents = documents;

      const legacyPhotos = req.body?.photos !== undefined ? normalizeStringArray(req.body.photos) : undefined;
      const geoTaggedPhoto = req.body?.geo_tagged_photo !== undefined ? normalizeString(req.body.geo_tagged_photo) : undefined;
      const additionalProgramPhotos = req.body?.additional_program_photos !== undefined ? normalizeStringArray(req.body.additional_program_photos).slice(0, 3) : undefined;

      if (legacyPhotos || geoTaggedPhoto || additionalProgramPhotos) {
        const existingPhotos = Array.isArray(existing.photos) ? existing.photos.filter((item) => normalizeString(item).length > 0) : [];
        const resolvedGeoPhoto = geoTaggedPhoto ?? legacyPhotos?.[0] ?? existing.geo_tagged_photo ?? existingPhotos[0] ?? "";
        const resolvedAdditionalPhotos = additionalProgramPhotos ?? legacyPhotos?.slice(1).slice(0, 3) ?? existing.additional_program_photos ?? existingPhotos.slice(1).slice(0, 3);

        updateData.geo_tagged_photo = resolvedGeoPhoto;
        updateData.additional_program_photos = resolvedAdditionalPhotos;
        updateData.photos = [resolvedGeoPhoto, ...resolvedAdditionalPhotos].filter((item) => item.length > 0);
      }

      if (req.body?.program_type !== undefined || req.body?.agronomist_specialist !== undefined || req.body?.collaborator !== undefined) {
        const nextProgramType = normalizeString(req.body?.program_type ?? req.body?.agronomist_specialist ?? req.body?.collaborator);
        updateData.program_type = nextType === "conducted" ? nextProgramType : undefined;
        updateData.agronomist_specialist = nextProgramType;
      }

      if (req.body?.organizer !== undefined || req.body?.instructor !== undefined) {
        const nextOrganizer = normalizeString(req.body?.organizer ?? req.body?.instructor);
        updateData.organizer = nextType === "attended" ? nextOrganizer : undefined;
        updateData.instructor = nextOrganizer;
      }

      if (req.body?.role !== undefined || req.body?.participant_role !== undefined) {
        updateData.role = nextType === "attended" ? normalizeString(req.body?.role ?? req.body?.participant_role) : undefined;
      }

      if (req.body?.no_of_people !== undefined) {
        const parsedPeople = Number(req.body.no_of_people);
        updateData.no_of_people = Number.isFinite(parsedPeople) ? parsedPeople : undefined;
      }

      if (req.body?.employee_name !== undefined) updateData.employee_name = normalizeString(req.body.employee_name);
      updateData.outreach_type = nextType;
      updateData.section_type = nextType;

      const nextProgramTitle = updateData.program_title ?? existing.program_title ?? existing.location;
      const nextLocation = updateData.location ?? existing.location;
      const nextDate = updateData.date ?? existing.date;
      const nextGeoPhoto = updateData.geo_tagged_photo ?? existing.geo_tagged_photo ?? "";

      if (!nextProgramTitle || !nextLocation || !nextDate || !nextGeoPhoto) {
        return res.status(400).json({ message: "Program title, location, date and geo-tagged photo are required." });
      }

      if (nextType === "conducted" && !normalizeString(updateData.program_type ?? existing.program_type ?? existing.agronomist_specialist)) {
        return res.status(400).json({ message: "Program type is required for conducted programs." });
      }

      if (nextType === "attended") {
        const organizerValue = normalizeString(updateData.organizer ?? existing.organizer ?? existing.instructor);
        const roleValue = normalizeString(updateData.role ?? existing.role);
        if (!organizerValue) {
          return res.status(400).json({ message: "Organizer is required for attended programs." });
        }
        if (!roleValue) {
          return res.status(400).json({ message: "Role is required for attended programs." });
        }
      }

      await outreach.updateOne(
        { _id: new ObjectId(outreachId) },
        { $set: updateData }
      );

      const updated = await outreach.findOne({
        _id: new ObjectId(outreachId),
      });

      return res.json({
        message: "Outreach record updated successfully.",
        outreach: mapOutreachResponse(updated),
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({
          message: error?.message ?? "Unable to update outreach record.",
        });
    }
  });

  app.delete("/api/outreach/:id", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const outreachId = String(req.params.id ?? "").trim();
      if (!outreachId || !ObjectId.isValid(outreachId)) {
        return res.status(400).json({ message: "Valid ID is required." });
      }

      const db = await getDb();
      const outreach = getCollection(db, "outreach_programmes");
      const existing = await outreach.findOne({ _id: new ObjectId(outreachId) });

      if (!existing) {
        return res.status(404).json({ message: "Outreach record not found." });
      }

      if (existing.employee_id !== requester.userId && requester.role !== "admin") {
        return res.status(403).json({ message: "You can only delete your own records or admin can delete any." });
      }

      await outreach.deleteOne({ _id: new ObjectId(outreachId) });

      return res.json({ message: "Outreach record deleted successfully." });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to delete outreach record." });
    }
  });

  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ message: "API endpoint not found." });
      return;
    }
    next();
  });

  app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    const reqId = (res.locals as any)?.reqId ?? "unknown";
    const errorMessage = String(error?.message ?? "Unexpected server error");
    console.error(`[${reqId}] Unhandled error on ${req.method} ${req.originalUrl}:`, error);

    if (res.headersSent) {
      return;
    }

    if (error?.type === "entity.too.large") {
      res.status(413).json({ message: "Payload too large." });
      return;
    }

    if (error instanceof SyntaxError && "body" in error) {
      res.status(400).json({ message: "Invalid JSON payload." });
      return;
    }

    res.status(Number(error?.statusCode) || 500).json({ message: errorMessage });
  });

  return app;
}