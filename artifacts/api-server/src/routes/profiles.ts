import { Router, type IRouter } from "express";
import { db, profilesTable } from "@workspace/db";
import { CreateProfileBody, DeleteProfileParams } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5002";

router.get("/profiles", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(profilesTable)
      .orderBy(desc(profilesTable.createdAt));
    res.json(rows);
  } catch (error: any) {
    console.error("GET /profiles Database Error:", error);
    res.status(500).json({ 
      error: "Failed to load profiles", 
      details: error.message,
      hint: "Check if the Supabase table matches the schema"
    });
  }
});

router.post("/profiles", async (req, res) => {
  const body = CreateProfileBody.parse(req.body);
  const [row] = await db
    .insert(profilesTable)
    .values({
      name: body.name,
      descriptor: body.descriptor,
      sampleCount: body.sampleCount,
    })
    .returning();
  res.status(201).json(row);
});

// New endpoint for backend-based training (Python)
router.post("/profiles/enroll", upload.single("image"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!req.file || !name) {
      return res.status(400).json({ error: "Image and name are required" });
    }

    // Call Python AI Service
    const formData = new FormData();
    formData.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${AI_SERVICE_URL}/enroll`, formData, {
      headers: formData.getHeaders(),
    });

    const { descriptor } = response.data;

    // Save to database
    const [row] = await db
      .insert(profilesTable)
      .values({
        name,
        descriptor,
        sampleCount: 1,
      })
      .returning();

    res.status(201).json(row);
  } catch (error: any) {
    console.error("AI Service Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to process face model in backend" });
  }
});

router.post("/profiles/:id/refine", async (req, res) => {
  try {
    const { id } = req.params;
    const { descriptor: newDescriptor } = req.body;

    if (!newDescriptor || !Array.isArray(newDescriptor)) {
      return res.status(400).json({ error: "Descriptor is required" });
    }

    // Get current profile
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.id, parseInt(id)));

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const currentDescriptor = profile.descriptor;
    const currentCount = profile.sampleCount || 1;

    // Calculate new running average
    const refinedDescriptor = currentDescriptor.map((val, i) => {
      const newVal = newDescriptor[i];
      if (newVal === undefined) return val;
      return (val * currentCount + newVal) / (currentCount + 1);
    });

    // Update profile
    const [updated] = await db
      .update(profilesTable)
      .set({
        descriptor: refinedDescriptor,
        sampleCount: currentCount + 1,
      })
      .where(eq(profilesTable.id, parseInt(id)))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Refinement Error:", error.message);
    res.status(500).json({ error: "Failed to refine profile" });
  }
});

router.delete("/profiles/:id", async (req, res) => {
  const { id } = DeleteProfileParams.parse(req.params);
  await db.delete(profilesTable).where(eq(profilesTable.id, id));
  res.status(204).end();
});

export default router;
