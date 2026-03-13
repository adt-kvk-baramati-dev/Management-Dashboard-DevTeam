import "dotenv/config";
import dns from "node:dns";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || "kvk_portal";
const dnsServers = String(process.env.MONGODB_DNS_SERVERS || "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
const seedTlsInsecure = String(process.env.MONGODB_SEED_TLS_INSECURE || "true").toLowerCase() === "true";

if (!uri) {
  throw new Error("Missing MONGODB_URI in .env");
}

let resolver = null;
if (dnsServers.length > 0) {
  resolver = new dns.Resolver();
  resolver.setServers(dnsServers);
}

function mongoLookup(hostname, options, callback) {
  const resolvePromise = new Promise((resolve, reject) => {
    if (!resolver) {
      dns.lookup(hostname, options, (error, address, family) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ address, family: family || 0 });
      });
      return;
    }

    resolver.resolve4(hostname, (error4, addresses4 = []) => {
      if (!error4 && addresses4.length > 0) {
        if (options?.all) {
          resolve({ address: addresses4.map((address) => ({ address, family: 4 })), family: 4 });
          return;
        }
        resolve({ address: addresses4[0], family: 4 });
        return;
      }

      resolver.resolve6(hostname, (error6, addresses6 = []) => {
        if (!error6 && addresses6.length > 0) {
          if (options?.all) {
            resolve({ address: addresses6.map((address) => ({ address, family: 6 })), family: 6 });
            return;
          }
          resolve({ address: addresses6[0], family: 6 });
          return;
        }

        reject(error4 || error6 || new Error(`No IP address found for ${hostname}`));
      });
    });
  });

  if (callback) {
    void resolvePromise
      .then(({ address, family }) => callback(null, address, family))
      .catch((error) => callback(error, "", 0));
    return;
  }

  return resolvePromise;
}

function nowMinusDays(days) {
  const dt = new Date();
  dt.setDate(dt.getDate() - days);
  return dt;
}

async function upsertBySeedKey(collection, docs) {
  for (const doc of docs) {
    await collection.updateOne(
      { seed_key: doc.seed_key },
      { $setOnInsert: doc },
      { upsert: true },
    );
  }
}

async function upsertByField(collection, docs, fieldName) {
  for (const doc of docs) {
    await collection.updateOne(
      { [fieldName]: doc[fieldName] },
      {
        $set: doc,
        $setOnInsert: { seeded_at: new Date() },
      },
      { upsert: true },
    );
  }
}

async function run() {
  const client = new MongoClient(uri, {
    lookup: mongoLookup,
    tlsInsecure: seedTlsInsecure,
  });
  await client.connect();

  try {
    const db = client.db(dbName);

    // 1) Employees first so dependent collections can reference these ids.
    const employees = db.collection("employees");
    await upsertByField(employees, [
      {
        seed_key: "emp-admin-1",
        name: "KVK Admin",
        role: "admin",
        email: "admin@kvk.in",
        domain_expertise: "Management",
        password_hash: "$2b$10$XwXxI8k4b2gQ8clDO7r.4uD79o.uRaMzh9rqx8X7F0p0bYQIv1/3i", // Admin!2026
        created_at: nowMinusDays(20),
      },
      {
        seed_key: "emp-officer-1",
        name: "Field Officer Ravi",
        role: "employee",
        email: "ravi.employee@kvk.in",
        domain_expertise: "Sugarcane",
        password_hash: "$2b$10$XwXxI8k4b2gQ8clDO7r.4uD79o.uRaMzh9rqx8X7F0p0bYQIv1/3i", // Admin!2026
        created_at: nowMinusDays(18),
      },
    ], "email");

    const adminEmp = await employees.findOne({ seed_key: "emp-admin-1" });
    const officerEmp = await employees.findOne({ seed_key: "emp-officer-1" });

    if (!adminEmp || !officerEmp) {
      throw new Error("Could not initialize employees for dependent records.");
    }

    // 2) Register (farmers)
    const register = db.collection("register");
    await upsertByField(register, [
      {
        seed_key: "reg-1",
        prn_no: "900001",
        farmer_name: "Santosh Patil",
        phone: "9876543210",
        district: "Kolhapur",
        village: "Rukadi",
        name: "Santosh Patil",
        mobile: "9876543210",
        role: "farmer",
        created_by: adminEmp._id.toString(),
        created_at: nowMinusDays(12),
      },
      {
        seed_key: "reg-2",
        prn_no: "900002",
        farmer_name: "Mahesh Jadhav",
        phone: "9765432109",
        district: "Sangli",
        village: "Miraj",
        name: "Mahesh Jadhav",
        mobile: "9765432109",
        role: "farmer",
        created_by: officerEmp._id.toString(),
        created_at: nowMinusDays(10),
      },
    ], "prn_no");

    // 3) Admin collection
    const admin = db.collection("admin");
    await upsertByField(admin, [
      {
        seed_key: "admin-1",
        name: "KVK Primary Admin",
        email: "admin1@kvk.in",
        password: "hashed-placeholder",
        mobile: "9000000001",
      },
      {
        seed_key: "admin-2",
        name: "KVK Secondary Admin",
        email: "admin2@kvk.in",
        password: "hashed-placeholder",
        mobile: "9000000002",
      },
    ], "email");

    // 4) Complaints
    const complaints = db.collection("complaints");
    await upsertBySeedKey(complaints, [
      {
        seed_key: "complaint-1",
        date: nowMinusDays(4),
        farmer_name: "Santosh Patil",
        name: "Santosh",
        subject: "Pest Attack",
        issue: "Leaf borer spread in plot",
        solve_status: "Pending",
        source: "call",
        registered_by: officerEmp._id.toString(),
        assigned_to: officerEmp._id.toString(),
        prn_no: "900001",
        prn: "900001",
        complaint_date: nowMinusDays(4).toISOString().slice(0, 10),
        district: "Kolhapur",
        taluka: "Hatkanangale",
        village: "Rukadi",
        complaint_type: "Pest",
        complaint: "Need immediate field visit",
        mobile: "9876543210",
        created_at: nowMinusDays(4),
      },
      {
        seed_key: "complaint-2",
        date: nowMinusDays(2),
        farmer_name: "Mahesh Jadhav",
        name: "Mahesh",
        subject: "Nutrient Deficiency",
        issue: "Yellowing in upper leaves",
        solve_status: "Solved",
        source: "field_visit",
        registered_by: adminEmp._id.toString(),
        assigned_to: officerEmp._id.toString(),
        resolution_notes: "Applied foliar spray recommendation",
        prn_no: "900002",
        prn: "900002",
        complaint_date: nowMinusDays(2).toISOString().slice(0, 10),
        district: "Sangli",
        taluka: "Miraj",
        village: "Miraj",
        complaint_type: "Nutrient",
        complaint: "Issue resolved after advisory",
        mobile: "9765432109",
        created_at: nowMinusDays(2),
      },
    ]);

    // 5) Employee activities
    await upsertBySeedKey(db.collection("employee_activities"), [
      {
        seed_key: "activity-1",
        employee_id: officerEmp._id.toString(),
        activity_type: "field_visit",
        date: nowMinusDays(3),
        location: "Rukadi",
        description: "Visited complaint site and captured observations",
        created_at: nowMinusDays(3),
      },
      {
        seed_key: "activity-2",
        employee_id: officerEmp._id.toString(),
        activity_type: "seminar",
        date: nowMinusDays(1),
        location: "KVK Hall",
        description: "Conducted sugarcane disease awareness seminar",
        created_at: nowMinusDays(1),
      },
    ]);

    // 6) Farmer visits
    await upsertBySeedKey(db.collection("farmer_visits"), [
      {
        seed_key: "visit-1",
        prn: "900001",
        visit_date: nowMinusDays(3).toISOString().slice(0, 10),
        farmer_name: "Santosh Patil",
        district: "Kolhapur",
        taluka: "Hatkanangale",
        village: "Rukadi",
        soil_condition: "Moist",
      },
      {
        seed_key: "visit-2",
        prn: "900002",
        visit_date: nowMinusDays(2).toISOString().slice(0, 10),
        farmer_name: "Mahesh Jadhav",
        district: "Sangli",
        taluka: "Miraj",
        village: "Miraj",
        soil_condition: "Dry",
      },
    ]);

    // 7) Fasal history
    await upsertBySeedKey(db.collection("fasal_history"), [
      {
        seed_key: "fasal-1",
        prn_no: "900001",
        record_id: 101,
        plot_name: "Plot A",
        farm_name: "Santosh Farm",
        record_date: nowMinusDays(1),
        humidity: 62,
        temperature: 31,
        created_at: nowMinusDays(1),
      },
      {
        seed_key: "fasal-2",
        prn_no: "900002",
        record_id: 102,
        plot_name: "Plot B",
        farm_name: "Mahesh Farm",
        record_date: nowMinusDays(1),
        humidity: 58,
        temperature: 33,
        created_at: nowMinusDays(1),
      },
    ]);

    // 8) KVK data
    await upsertBySeedKey(db.collection("kvk_data"), [
      {
        seed_key: "kvk-1",
        prn_no: "900001",
        farmer_name: "Santosh Patil",
        week: "Week 10",
        record_date: nowMinusDays(1),
        ph: 6.8,
        ec: 1.1,
        created_at: nowMinusDays(1),
      },
      {
        seed_key: "kvk-2",
        prn_no: "900002",
        farmer_name: "Mahesh Jadhav",
        week: "Week 10",
        record_date: nowMinusDays(1),
        ph: 7.1,
        ec: 0.9,
        created_at: nowMinusDays(1),
      },
    ]);

    // 9) Map feedback
    await upsertBySeedKey(db.collection("map_feedback"), [
      {
        seed_key: "feedback-1",
        prn: "900001",
        farmer_name: "Santosh Patil",
        mobile: "9876543210",
        district: "Kolhapur",
        taluka: "Hatkanangale",
        village: "Rukadi",
        remark: "NDVI reflects field condition correctly",
      },
      {
        seed_key: "feedback-2",
        prn: "900002",
        farmer_name: "Mahesh Jadhav",
        mobile: "9765432109",
        district: "Sangli",
        taluka: "Miraj",
        village: "Miraj",
        remark: "Need more frequent updates",
      },
    ]);

    // 10) Map my crop
    await upsertBySeedKey(db.collection("map_my_crop"), [
      {
        seed_key: "mmc-1",
        prn_no: "900001",
        record_id: 201,
        farm_id: "FARM001",
        farm_name: "Santosh Farm",
        phone: "9876543210",
        record_date: nowMinusDays(1),
        min_temp: 23,
        max_temp: 33,
        ndvi: 0.67,
        created_at: nowMinusDays(1),
      },
      {
        seed_key: "mmc-2",
        prn_no: "900002",
        record_id: 202,
        farm_id: "FARM002",
        farm_name: "Mahesh Farm",
        phone: "9765432109",
        record_date: nowMinusDays(1),
        min_temp: 24,
        max_temp: 34,
        ndvi: 0.61,
        created_at: nowMinusDays(1),
      },
    ]);

    // 11) Outreach programmes
    await upsertBySeedKey(db.collection("outreach_programmes"), [
      {
        seed_key: "outreach-1",
        programme_type: "Seminar",
        programme_name: "Soil Health Camp",
        programme_date: nowMinusDays(5).toISOString().slice(0, 10),
        location: "KVK Center",
        organizer: "KVK Team",
        farmers_attended: 42,
        district: "Kolhapur",
        taluka: "Hatkanangale",
        village: "Rukadi",
        created_at: nowMinusDays(5),
      },
      {
        seed_key: "outreach-2",
        programme_type: "Field Demo",
        programme_name: "Pest Control Demo",
        programme_date: nowMinusDays(2).toISOString().slice(0, 10),
        location: "Miraj Plot",
        organizer: "KVK Team",
        farmers_attended: 28,
        district: "Sangli",
        taluka: "Miraj",
        village: "Miraj",
        created_at: nowMinusDays(2),
      },
    ]);

    // 12) User login
    await upsertBySeedKey(db.collection("user_login"), [
      {
        seed_key: "ulog-1",
        email: "admin@kvk.in",
        created_at: nowMinusDays(1),
      },
      {
        seed_key: "ulog-2",
        email: "ravi.employee@kvk.in",
        created_at: nowMinusDays(1),
      },
    ]);

    // 13) Users mapping
    await upsertBySeedKey(db.collection("users"), [
      {
        seed_key: "users-1",
        email: "admin@kvk.in",
        role: "admin",
      },
      {
        seed_key: "users-2",
        email: "ravi.employee@kvk.in",
        role: "employee",
      },
    ]);

    const summaryCollections = [
      "admin",
      "complaints",
      "employee_activities",
      "employees",
      "farmer_visits",
      "fasal_history",
      "kvk_data",
      "map_feedback",
      "map_my_crop",
      "outreach_programmes",
      "register",
      "user_login",
      "users",
    ];

    const counts = {};
    for (const name of summaryCollections) {
      counts[name] = await db.collection(name).countDocuments({});
    }

    console.log("Seed completed successfully.");
    console.table(counts);
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
