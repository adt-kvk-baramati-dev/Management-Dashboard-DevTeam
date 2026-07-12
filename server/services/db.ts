import dns from "node:dns";
import type { LookupAddress, LookupOptions } from "node:dns";
import bcrypt from "bcryptjs";
import { MongoClient, ObjectId } from "mongodb";
import { getMongoUri, getMongoDbName, requireEnvValue } from "../config/env";
import { ensureMongoCollections } from "../mongoSchema";
import type { EmployeeDocument } from "../types";
import { getCollection } from "../utils/helpers";

// ─── DNS helpers ──────────────────────────────────────────────────────────────

let dnsConfigured = false;
let mongoLookupConfigured = false;
let mongoLookupResolver: dns.Resolver | null = null;

function configureMongoDns() {
  if (dnsConfigured) return;
  const configured = String(process.env.MONGODB_DNS_SERVERS ?? "").trim();
  if (!configured) { dnsConfigured = true; return; }
  const servers = configured.split(",").map((v) => v.trim()).filter(Boolean);
  if (servers.length > 0) dns.setServers(servers);
  dnsConfigured = true;
}

function configureMongoLookupResolver() {
  if (mongoLookupConfigured) return;
  const configured = String(process.env.MONGODB_DNS_SERVERS ?? "").trim();
  if (!configured) { mongoLookupConfigured = true; return; }
  const servers = configured.split(",").map((v) => v.trim()).filter(Boolean);
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
  const resolvePromise = new Promise<{ address: string | LookupAddress[]; family: number }>(
    (resolve, reject) => {
      if (!mongoLookupResolver) {
        dns.lookup(hostname, options, (error, address, family) => {
          if (error) { reject(error); return; }
          resolve({ address, family: family ?? 0 });
        });
        return;
      }

      mongoLookupResolver.resolve4(hostname, (error4, addresses4 = []) => {
        if (!error4 && addresses4.length > 0) {
          if (options?.all) {
            resolve({ address: addresses4.map((address) => ({ address, family: 4 })), family: 4 });
            return;
          }
          resolve({ address: addresses4[0], family: 4 });
          return;
        }

        mongoLookupResolver!.resolve6(hostname, (error6, addresses6 = []) => {
          if (!error6 && addresses6.length > 0) {
            if (options?.all) {
              resolve({ address: addresses6.map((address) => ({ address, family: 6 })), family: 6 });
              return;
            }
            resolve({ address: addresses6[0], family: 6 });
            return;
          }
          reject((error4 || error6 || new Error(`No IP address found for ${hostname}`)) as NodeJS.ErrnoException);
        });
      });
    }
  );

  if (callback) {
    void resolvePromise
      .then(({ address, family }) => callback(null, address, family))
      .catch((error) => callback(error as NodeJS.ErrnoException, "", 0));
    return;
  }
  return resolvePromise;
}

// ─── MongoDB singleton ────────────────────────────────────────────────────────

let mongoClient: MongoClient | null = null;
let mongoReadyPromise: Promise<void> | null = null;
export let mongoStartupError: Error | null = null;

export async function getDb() {
  requireEnvValue(getMongoUri(), "MONGODB_URI");
  configureMongoDns();
  configureMongoLookupResolver();
  if (!mongoClient) {
    const candidateClient = new MongoClient(getMongoUri(), { lookup: mongoLookup });
    try {
      await candidateClient.connect();
      mongoClient = candidateClient;
    } catch (error) {
      await candidateClient.close().catch(() => { });
      mongoClient = null;
      throw error;
    }
  }
  return mongoClient.db(getMongoDbName());
}

export async function ensureMongoSetup(): Promise<void> {
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
          name: adminName, role: "admin", email: adminEmail,
          domain_expertise: "Management", password_hash, created_at: new Date(),
        });
      } else {
        const passwordMatch = await bcrypt.compare(adminPassword, existingAdmin.password_hash);
        if (!passwordMatch || existingAdmin.role !== "admin" || existingAdmin.name !== adminName) {
          const password_hash = passwordMatch ? existingAdmin.password_hash : await bcrypt.hash(adminPassword, 10);
          await employees.updateOne(
            { _id: existingAdmin._id },
            { $set: { name: adminName, role: "admin", domain_expertise: "Management", password_hash } },
          );
        }
      }
    }
  })();

  return mongoReadyPromise;
}

export function setMongoStartupError(err: Error | null) {
  mongoStartupError = err;
}

export async function closeMongo(): Promise<void> {
  if (!mongoClient) return;

  await mongoClient.close();
  mongoClient = null;
  mongoReadyPromise = null;
  mongoStartupError = null;
}

// ─── Employee helpers ─────────────────────────────────────────────────────────

export function toEmployeeResponse(employee: EmployeeDocument) {
  return {
    id: employee.employee_id || employee._id!.toString(),
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

export async function getNextEmployeeId(employees: any): Promise<string> {
  const lastEmployee = await employees.findOne({}, { sort: { created_at: -1 } });
  if (!lastEmployee?.employee_id) return "E-001";
  const numPart = parseInt(lastEmployee.employee_id.split("-")[1], 10);
  return `E-${String(numPart + 1).padStart(3, "0")}`;
}
