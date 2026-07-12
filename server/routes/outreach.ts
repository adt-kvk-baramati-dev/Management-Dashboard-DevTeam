import { Router } from "express";
import { ObjectId } from "mongodb";
import { getRequester } from "../services/auth";
import { getDb } from "../services/db";
import {
  getCollection, normalizeOutreachType, normalizeString, normalizeDocuments,
  normalizeStringArray, parseGeoNumber, mapOutreachResponse
} from "../utils/helpers";
import type { OutreachProgrammeDocument, EmployeeActivityDocument } from "../types";

const router = Router();

// POST /api/outreach
router.post("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    if (requester.role !== "admin" && requester.role !== "employee") {
      return res.status(403).json({ message: "Only admin or employee can create outreach records." });
    }

    const outreachType = normalizeOutreachType(req.body?.outreach_type ?? req.body?.section_type);
    const programTitle = normalizeString(req.body?.program_title ?? req.body?.location);
    const location = normalizeString(req.body?.location);
    const date = normalizeString(req.body?.date);
    const db = await getDb();
    const employeeDb = await getCollection(db, "employees").findOne({ _id: new ObjectId(requester.userId) });
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

    if (!outreachType) return res.status(400).json({ message: "outreach_type is required and must be conducted or attended." });
    if (!programTitle) return res.status(400).json({ message: "Program title is required." });
    if (!location) return res.status(400).json({ message: "Location is required." });
    if (!date) return res.status(400).json({ message: "Date is required." });
    if (!geoTaggedPhoto) return res.status(400).json({ message: "A geo-tagged photo is required." });

    if (outreachType === "conducted") {
      if (!programType) return res.status(400).json({ message: "Program type is required for conducted programs." });
    } else if (outreachType === "attended") {
      if (!organizer) return res.status(400).json({ message: "Organizer is required for attended programs." });
      if (!role) return res.status(400).json({ message: "Role is required for attended programs." });
    }

    const createdDate = new Date();
    const outreachRecord: OutreachProgrammeDocument = {
      employee_id: requester.userId, employee_name: employeeName, created_by: requester.userId,
      outreach_type: outreachType, section_type: outreachType, program_title: programTitle,
      program_type: outreachType === "conducted" ? programType : undefined,
      organizer: outreachType === "attended" ? organizer : undefined,
      role: outreachType === "attended" ? role : undefined,
      location, date, remarks, key_learning: keyLearning, detailed_report: detailedReport,
      supporting_documents: supportingDocuments, geo_tagged_photo: geoTaggedPhoto,
      additional_program_photos: additionalProgramPhotos.slice(0, 3),
      certificate: outreachType === "attended" ? certificate : undefined,
      geo_latitude: geoLatitude, geo_longitude: geoLongitude, geo_location_label: geoLocationLabel,
      district, taluka, village, duration,
      photos: [geoTaggedPhoto, ...additionalProgramPhotos].filter((item) => item.length > 0),
      agronomist_specialist: programType, no_of_people: noOfPeople, instructor: organizer,
      created_at: createdDate, created_date: createdDate, updated_at: createdDate, last_updated: createdDate,
    };

    const outreach = getCollection(db, "outreach_programmes");
    const result = await outreach.insertOne(outreachRecord);

    try {
      await getCollection(db, "employee_activities").insertOne({
        employee_id: requester.userId,
        activity_type: outreachType === "conducted" ? "OUTREACH_CONDUCTED" : "OUTREACH_ATTENDED",
        date: new Date(date), location,
        description: outreachType === "conducted" ? `Outreach conducted at ${programTitle}` : `Outreach attended at ${programTitle}`,
        created_at: new Date(),
      } as EmployeeActivityDocument);
    } catch (activityError) {
      console.warn("Unable to create linked outreach activity:", activityError);
    }

    const created = await outreach.findOne({ _id: result.insertedId });
    return res.status(201).json({ message: "Outreach record created successfully.", outreach: mapOutreachResponse(created) });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to create outreach record." });
  }
});

// GET /api/outreach
router.get("/", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

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
        const matchesEmployee = !employeeFilter || row.employee_id === employeeFilter || row.employee_name.toLowerCase().includes(employeeFilter.toLowerCase());
        const matchesOutreachType = !outreachTypeFilter || row.outreach_type === outreachTypeFilter;

        return matchesSearch && matchesDate && matchesProgramType && matchesEmployee && matchesOutreachType;
      });

    return res.json({ outreach: filtered });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch outreach records." });
  }
});

// GET /api/outreach/employee/:employeeId
router.get("/employee/:employeeId", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const employeeId = String(req.params.employeeId ?? "").trim();
    if (!employeeId) return res.status(400).json({ message: "employeeId is required." });

    if (requester.role !== "admin" && requester.userId !== employeeId) {
      const db2 = await getDb();
      const emp2 = await getCollection(db2, "employees").findOne({ _id: new ObjectId(requester.userId) });
      const customId = emp2?.employee_id ?? "";
      if (customId !== employeeId) return res.status(403).json({ message: "You can only view your own outreach records." });
    }

    const db = await getDb();
    const outreach = getCollection(db, "outreach_programmes");

    let resolvedId = employeeId;
    if (!ObjectId.isValid(employeeId)) {
      const emp = await getCollection(db, "employees").findOne({ employee_id: employeeId });
      if (emp) resolvedId = emp._id!.toString();
    }

    const rows = await outreach.find({ employee_id: resolvedId }).sort({ created_at: -1, created_date: -1 }).toArray();
    return res.json({ outreach: rows.map((row) => mapOutreachResponse(row)) });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to fetch employee outreach records." });
  }
});

// PUT /api/outreach/:id
router.put("/:id", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const outreachId = String(req.params.id ?? "").trim();
    if (!outreachId || !ObjectId.isValid(outreachId)) return res.status(400).json({ message: "Valid ID is required." });

    const db = await getDb();
    const outreach = getCollection(db, "outreach_programmes");
    const existing = await outreach.findOne({ _id: new ObjectId(outreachId) });
    if (!existing) return res.status(404).json({ message: "Outreach record not found." });

    if (existing.employee_id !== requester.userId && requester.role !== "admin") {
      return res.status(403).json({ message: "You can only edit your own records or admin can edit any." });
    }

    const existingType = normalizeOutreachType(existing.outreach_type ?? existing.section_type) ?? "conducted";
    const nextType = normalizeOutreachType(req.body?.outreach_type ?? req.body?.section_type) ?? existingType;
    const now = new Date();
    const updateData: Partial<OutreachProgrammeDocument> = { updated_at: now, last_updated: now };

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
      if (!organizerValue) return res.status(400).json({ message: "Organizer is required for attended programs." });
      if (!roleValue) return res.status(400).json({ message: "Role is required for attended programs." });
    }

    await outreach.updateOne({ _id: new ObjectId(outreachId) }, { $set: updateData });

    const updated = await outreach.findOne({ _id: new ObjectId(outreachId) });
    return res.json({ message: "Outreach record updated successfully.", outreach: mapOutreachResponse(updated) });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to update outreach record." });
  }
});

// DELETE /api/outreach/:id
router.delete("/:id", async (req, res) => {
  try {
    const requester = await getRequester(req.header("authorization"));
    if (!requester) return res.status(401).json({ message: "Unauthorized" });

    const outreachId = String(req.params.id ?? "").trim();
    if (!outreachId || !ObjectId.isValid(outreachId)) return res.status(400).json({ message: "Valid ID is required." });

    const db = await getDb();
    const outreach = getCollection(db, "outreach_programmes");
    const existing = await outreach.findOne({ _id: new ObjectId(outreachId) });

    if (!existing) return res.status(404).json({ message: "Outreach record not found." });
    if (existing.employee_id !== requester.userId && requester.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own records or admin can delete any." });
    }

    await outreach.deleteOne({ _id: new ObjectId(outreachId) });
    return res.json({ message: "Outreach record deleted successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message ?? "Unable to delete outreach record." });
  }
});

export default router;
