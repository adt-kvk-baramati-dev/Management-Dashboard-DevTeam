import "dotenv/config";
import dns from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";
import { handleDemo } from "./routes/demo";
import { ensureMongoCollections } from "./mongoSchema";

type EmployeeRole = "admin" | "employee";

type EmployeeDocument = {
  _id?: ObjectId;
  name: string;
  role: EmployeeRole;
  email: string;
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
  created_at: Date;
};

type FarmerResponse = {
  id: string;
  prn_no: string;
  name: string;
  phone: string;
  district: string;
  village: string;
};

type ComplaintStatus = "Pending" | "Solved";

type ComplaintSource = "call" | "field_visit" | "excel_import";

type ComplaintDocument = {
  _id?: ObjectId;
  date?: Date;
  farmer_name: string;
  name?: string;
  subject?: string;
  issue?: string;
  solve_status?: ComplaintStatus;
  source?: ComplaintSource;
  registered_by?: string;
  assigned_to?: string | null;
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
  created_at: Date;
  updated_at?: Date;
};

type EmployeeActivityDocument = {
  _id?: ObjectId;
  employee_id: string;
  activity_type: "field_visit" | "expert_session" | "seminar";
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
  programme_type?: string;
  programme_name?: string;
  programme_date?: string;
  district?: string;
  taluka?: string;
  village?: string;
  created_at?: Date;
};

type MapFeedbackDocument = {
  _id?: ObjectId;
  prn?: string;
  farmer_name?: string;
  district?: string;
  taluka?: string;
  village?: string;
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
  fasal_history: FasalHistoryDocument;
  kvk_data: KvkDataDocument;
  map_feedback: MapFeedbackDocument;
  map_my_crop: MapMyCropDocument;
  outreach_programmes: OutreachProgrammeDocument;
  register: RegisterDocument;
  user_login: UserLoginDocument;
  users: UserDocument;
};

type CollectionName = keyof Collections;

function getCollection<K extends CollectionName>(db: ReturnType<MongoClient["db"]>, name: K) {
  return db.collection<Collections[K]>(name);
}

type LegacyFarmerDocument = {
  _id?: ObjectId;
  prn_no: string;
  name: string;
  phone: string;
  district: string;
  village: string;
  created_by: string;
  created_at: Date;
};

const mongoUri = process.env.MONGODB_URI ?? "";
const mongoDbName = process.env.MONGODB_DB_NAME ?? "kvk_portal";
const jwtSecret = process.env.JWT_SECRET ?? "";

type UploadRecord = Record<string, any>;

let mongoClient: MongoClient | null = null;
let mongoReadyPromise: Promise<void> | null = null;
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
  callback?: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  const resolvePromise = new Promise<{ address: string | LookupAddress[]; family: number }>((resolve, reject) => {
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

        reject((error4 || error6 || new Error(`No IP address found for ${hostname}`)) as NodeJS.ErrnoException);
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
  return toDate(record.record_date ?? record.date ?? record.satellite_date ?? record.complaint_date);
}

function sanitizeUploadDocument(record: Record<string, any>) {
  const clone = { ...record };
  delete clone._id;
  delete clone.created_at;
  return clone;
}

async function executeBulkUpdates(collection: any, operations: any[], chunkSize = 1000) {
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
    const currentDt = toDate(current.record_date ?? current.updated_at ?? current.created_at ?? current.date);
    const rowDt = toDate(row.record_date ?? row.updated_at ?? row.created_at ?? row.date);
    if (rowDt >= currentDt) {
      map.set(prn, row);
    }
  }
  return map;
}

async function getDb() {
  requireEnvValue(mongoUri, "MONGODB_URI");
  configureMongoDns();
  configureMongoLookupResolver();
  if (!mongoClient) {
    const candidateClient = new MongoClient(mongoUri, {
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
  return mongoClient.db(mongoDbName);
}

async function ensureMongoSetup() {
  if (mongoReadyPromise) return mongoReadyPromise;

  mongoReadyPromise = (async () => {
    const db = await getDb();
    await ensureMongoCollections(db);

    const employees = getCollection(db, "employees");

    const adminEmail = String(process.env.MONGO_ADMIN_EMAIL ?? "").trim().toLowerCase();
    const adminPassword = String(process.env.MONGO_ADMIN_PASSWORD ?? "").trim();
    const adminName = String(process.env.MONGO_ADMIN_NAME ?? "KVK Admin").trim();

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
        const passwordMatch = await bcrypt.compare(adminPassword, existingAdmin.password_hash);
        if (!passwordMatch || existingAdmin.role !== "admin" || existingAdmin.name !== adminName) {
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

function signToken(payload: { userId: string; role: EmployeeRole; email: string }) {
  requireEnvValue(jwtSecret, "JWT_SECRET");
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

async function getRequester(authHeader?: string): Promise<{ userId: string; role: EmployeeRole; email: string } | null> {
  const token = getBearerToken(authHeader);
  if (!token) return null;

  requireEnvValue(jwtSecret, "JWT_SECRET");

  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret);
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

  return { userId: employee._id.toString(), role: employee.role, email: employee.email };
}

function toEmployeeResponse(employee: EmployeeDocument) {
  return {
    id: employee._id.toString(),
    name: employee.name,
    role: employee.role,
    email: employee.email,
    domain_expertise: employee.domain_expertise ?? null,
  };
}

export function createServer() {
  const app = express();

  void ensureMongoSetup().catch((error) => {
    console.error("MongoDB setup failed:", error);
  });

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.get("/api/data", async (_req, res) => {
    try {
      const db = await getDb();
      const register = getCollection(db, "register");
      const mapMyCrop = getCollection(db, "map_my_crop");
      const fasalHistory = getCollection(db, "fasal_history");
      const kvkData = getCollection(db, "kvk_data");

      const [farmers, mapRows, fasalRows, kvkRows] = await Promise.all([
        register.find({}).toArray(),
        mapMyCrop.find({}).toArray(),
        fasalHistory.find({}).toArray(),
        kvkData.find({}).toArray(),
      ]);

      const farmerByPrn = new Map(farmers.map((f) => [normalizePrn(f.prn_no), f]));
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
            date: (
              mapData?.record_date ??
              fasalData?.record_date ??
              kvk?.record_date ??
              farmer?.created_at ??
              new Date()
            ),
            prn_no: prn,
            farmer_name: farmer?.farmer_name ?? kvk?.farmer_name ?? mapData?.farm_name ?? "Unknown",
            map_data: mapData,
            fasal_data: fasalData,
            kvk_data: kvk,
          };
        })
        .sort((a, b) => Number(b.prn_no) - Number(a.prn_no));

      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message ?? "Unable to load data." });
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
        return res.status(400).json({ success: false, message: "records array is required." });
      }

      const db = await getDb();
      const register = getCollection(db, "register");
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

        const farmerName = String(record.farmer_name ?? record.name ?? "").trim();
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

        if (record.map_data || record.ndvi !== undefined || record.farm_id || record.record_id) {
          const mapRaw = record.map_data && typeof record.map_data === "object" ? record.map_data : record;
          const mapData = sanitizeUploadDocument(mapRaw);
          const mapRecordId = Number(mapData.record_id ?? 0);
          const mapFilter: Record<string, unknown> = { prn_no: prn, record_date: recordDate };
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
          const fasalRaw = record.fasal_data && typeof record.fasal_data === "object" ? record.fasal_data : record;
          const fasalData = sanitizeUploadDocument(fasalRaw);
          const fasalRecordId = Number(fasalData.record_id ?? 0);
          const fasalFilter: Record<string, unknown> = { prn_no: prn, record_date: recordDate };
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
          const kvkRaw = record.kvk_data && typeof record.kvk_data === "object" ? record.kvk_data : record;
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

      const [upsertedRegister, upsertedMapMyCrop, upsertedFasalHistory, upsertedKvkData] = await Promise.all([
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
      return res.status(500).json({ success: false, message: error?.message ?? "Upload failed." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "").trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    try {
      const db = await getDb();
      const employees = getCollection(db, "employees");
      const employee = await employees.findOne({ email });
      if (!employee) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const validPassword = await bcrypt.compare(password, employee.password_hash);
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
      return res.status(500).json({ message: error?.message ?? "Server error during login." });
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
      const profile = await employees.findOne({ _id: new ObjectId(requester.userId) });
      if (!profile) {
        return res.status(404).json({ message: "Employee profile not found." });
      }

      return res.json({ profile: toEmployeeResponse(profile) });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to fetch profile." });
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
      const register = getCollection(db, "register");
      const mapMyCrop = getCollection(db, "map_my_crop");
      const fasalHistory = getCollection(db, "fasal_history");
      const kvkData = getCollection(db, "kvk_data");

      const bulkRows = await register
        .find(
          { farmer_name: { $regex: /^Bulk Farmer\s\d+$/i } },
          { projection: { prn_no: 1 } },
        )
        .toArray();

      const prns = Array.from(new Set(bulkRows.map((row) => normalizePrn((row as any).prn_no)).filter(Boolean)));
      if (prns.length === 0) {
        return res.json({
          success: true,
          message: "No bulk test data found.",
          summary: { bulkPrns: 0, register: 0, map_my_crop: 0, fasal_history: 0, kvk_data: 0 },
        });
      }

      const [registerResult, mapResult, fasalResult, kvkResult] = await Promise.all([
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
      return res.status(500).json({ message: error?.message ?? "Cleanup failed." });
    }
  });

  app.post("/api/admin/reset-portal-data", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (requester.role !== "admin") {
        return res.status(403).json({ message: "Only admin can reset portal data." });
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
      const register = getCollection(db, "register");
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

      await employees.deleteMany({ email: { $nin: ["admin@kvk.in", "a@kvk.in", "b@kvk.in"] } });

      const adminPassword = String(process.env.MONGO_ADMIN_PASSWORD ?? "Admin!2026").trim() || "Admin!2026";
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

      const remainingEmployees = await employees.find({}, { projection: { name: 1, email: 1, role: 1 } }).toArray();

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
      return res.status(500).json({ message: error?.message ?? "Reset failed." });
    }
  });

  app.post("/api/admin/employees", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin") {
        return res.status(403).json({ message: "Only admin can add employees." });
      }

      const name = String(req.body?.name ?? "").trim();
      const email = String(req.body?.email ?? "").trim().toLowerCase();
      const password = String(req.body?.password ?? "").trim();
      const domainExpertise = String(req.body?.domain_expertise ?? "").trim() || null;

      if (!name || !email || !password) {
        return res.status(400).json({ message: "name, email and password are required." });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");

      const existing = await employees.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: "Employee with this email already exists." });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const insert = await employees.insertOne({
        name,
        role: "employee",
        email,
        domain_expertise: domainExpertise,
        password_hash,
        created_at: new Date(),
      });

      return res.status(201).json({
        message: "Employee created successfully.",
        employee: {
          id: insert.insertedId.toString(),
          name,
          email,
          role: "employee",
          domain_expertise: domainExpertise,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to create employee." });
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

      const rows = await employees.find(filter).sort({ created_at: -1 }).toArray();
      return res.json({ employees: rows.map(toEmployeeResponse) });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to load employees." });
    }
  });

  app.post("/api/farmers", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin" && requester.role !== "employee") {
        return res.status(403).json({ message: "Only admin or employee can add farmers." });
      }

      const prnNo = String(req.body?.prn_no ?? "").trim();
      const name = String(req.body?.name ?? "").trim();
      const phone = String(req.body?.phone ?? "").trim();
      const district = String(req.body?.district ?? "").trim();
      const village = String(req.body?.village ?? "").trim();

      if (!prnNo || !name || !phone || !district || !village) {
        return res.status(400).json({ message: "prn_no, name, phone, district, village are required." });
      }

      const db = await getDb();
      const register = getCollection(db, "register");

      const existing = await register.findOne({ prn_no: prnNo });
      if (existing) {
        return res.status(409).json({ message: "Farmer with this PRN already exists." });
      }

      const insert = await register.insertOne({
        prn_no: prnNo,
        farmer_name: name,
        name,
        mobile: phone,
        phone,
        district,
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
              village: createdFarmer.village,
            }
          : null,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to create farmer." });
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
      const register = getCollection(db, "register");
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
          village: farmer.village,
        } as FarmerResponse,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to fetch farmer." });
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
        filter.assigned_to = requester.userId;
      }

      const rows = await complaints.find(filter).sort({ created_at: -1 }).toArray();
      return res.json({
        complaints: rows.map((row) => ({
          id: row._id.toString(),
          prn_no: row.prn_no,
          farmer_name: row.farmer_name,
          phone: row.mobile ?? "",
          subject: row.subject ?? "",
          domain: row.complaint_type ?? row.subject ?? "General",
          solve_status: row.solve_status ?? "Pending",
          assigned_to: row.assigned_to ?? null,
          created_at: row.created_at,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to fetch complaints." });
    }
  });

  app.patch("/api/complaints/:id/assign", async (req, res) => {
    try {
      const requester = await getRequester(req.header("authorization"));
      if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (requester.role !== "admin") {
        return res.status(403).json({ message: "Only admin can assign complaints." });
      }

      const complaintId = String(req.params.id ?? "").trim();
      const employeeId = String(req.body?.employeeId ?? "").trim();

      if (!ObjectId.isValid(complaintId) || !ObjectId.isValid(employeeId)) {
        return res.status(400).json({ message: "Valid complaint and employee ids are required." });
      }

      const db = await getDb();
      const employees = getCollection(db, "employees");
      const complaints = getCollection(db, "complaints");

      const employee = await employees.findOne({ _id: new ObjectId(employeeId), role: "employee" });
      if (!employee) {
        return res.status(404).json({ message: "Employee not found." });
      }

      const update = await complaints.updateOne(
        { _id: new ObjectId(complaintId) },
        { $set: { assigned_to: employeeId, updated_at: new Date() } },
      );

      if (!update.matchedCount) {
        return res.status(404).json({ message: "Complaint not found." });
      }

      return res.json({ message: "Complaint assigned successfully." });
    } catch (error: any) {
      return res.status(500).json({ message: error?.message ?? "Unable to assign complaint." });
    }
  });

  return app;
}
