import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ensure this path matches your project structure
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

// Optional: Keep file logging as a backup, or remove if not needed.
const DATA_DIR = path.join(process.cwd(), "data", "veget-forms");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Validation
    if (!body.siteId) {
      return NextResponse.json(
        { error: "Site ID is required" },
        { status: 400 }
      );
    }

    // 2. Extract Answers: Separate specific Q&A keys (L1, V1, etc.) from metadata
    const {
      siteId,
      observerName,
      date,
      notes,
      overallScore,
      overallRating,
      landscapeAvg,
      sizeAvg,
      vegAvg,
      soilAvg,
      hydroAvg,
      ...rawAnswers 
    } = body;

    // 3. Save to Database (Prisma)
    const record = await prisma.vegetationLog.create({
      data: {
        siteId: String(siteId),
        observerName: String(observerName || ""),
        // Convert "YYYY-MM-DD" string to Date object
        date: new Date(date), 
        notes: String(notes || ""),
        
        overallScore: overallScore ? parseFloat(overallScore) : null,
        overallRating: String(overallRating || ""),
        
        landscapeAvg: landscapeAvg ? parseFloat(landscapeAvg) : null,
        sizeAvg: sizeAvg ? parseFloat(sizeAvg) : null,
        vegAvg: vegAvg ? parseFloat(vegAvg) : null,
        soilAvg: soilAvg ? parseFloat(soilAvg) : null,
        hydroAvg: hydroAvg ? parseFloat(hydroAvg) : null,

        // Store the rest of the body (L1, V1, etc.) as JSON
        answers: rawAnswers,
      },
    });

    // ---------------------------------------------------------
    // OPTIONAL: Keep CSV Backup (legacy logic)
    // ---------------------------------------------------------
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const csvPath = path.join(DATA_DIR, "summary_log.csv");
      
      const headers = [
        "Record ID", "Submission Date", "Site ID", "Observer", "Overall Score", "Overall Rating"
      ];

      if (!existsSync(csvPath)) {
        await fs.writeFile(csvPath, headers.join(",") + "\n", "utf8");
      }

      const row = [
        record.id,
        new Date().toISOString(),
        `"${(siteId || "").replace(/"/g, '""')}"`,
        `"${(observerName || "").replace(/"/g, '""')}"`,
        overallScore?.toFixed(2) || "",
        `"${overallRating || ""}"`,
      ];

      await fs.appendFile(csvPath, row.join(",") + "\n", "utf8");
    } catch (fsError) {
      console.warn("Backup to CSV failed, but DB save was successful:", fsError);
    }
    // ---------------------------------------------------------

    return NextResponse.json({ ok: true, id: record.id, message: "Saved to database" });

  } catch (error: any) {
    console.error("Save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save data" },
      { status: 500 }
    );
  }
}