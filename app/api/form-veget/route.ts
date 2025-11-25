import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

// Define where to save the files
const DATA_DIR = path.join(process.cwd(), "data", "veget-forms");

// Helper to ensure directory exists
async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Ensure the data folder exists
    await ensureDir();

    // 2. Save individual JSON file (Contains EVERYTHING: answers, notes, full stats)
    // Create a safe filename using SiteID and Date
    const timestamp = Date.now();
    const safeId = (body.siteId || "unknown").replace(/[^a-z0-9]/gi, "_");
    const filename = `veget_${safeId}_${timestamp}.json`;
    const filePath = path.join(DATA_DIR, filename);

    await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

    // 3. Append to a Summary CSV file (Contains key stats for easy analysis)
    const csvPath = path.join(DATA_DIR, "summary_log.csv");
    
    // Define the columns we want in the CSV summary
    const headers = [
      "File Name",
      "Submission Date",
      "Site ID",
      "Observer",
      "Overall Score",
      "Overall Rating",
      "Landscape Avg",
      "Size Avg",
      "Vegetation Avg",
      "Soils Avg",
      "Hydrology Avg"
    ];

    // Check if CSV exists; if not, create it with headers
    if (!existsSync(csvPath)) {
      await fs.writeFile(csvPath, headers.join(",") + "\n", "utf8");
    }

    // Prepare the row data
    // Note: We access the specific fields sent from the frontend payload
    const row = [
      filename,
      new Date().toISOString(),
      `"${(body.siteId || "").replace(/"/g, '""')}"`,      // Escape quotes
      `"${(body.observerName || "").replace(/"/g, '""')}"`,
      body.overallScore?.toFixed(2) || "",
      `"${body.overallRating || ""}"`,
      body.landscapeAvg?.toFixed(2) || "",
      body.sizeAvg?.toFixed(2) || "",
      body.vegAvg?.toFixed(2) || "",
      body.soilAvg?.toFixed(2) || "",
      body.hydroAvg?.toFixed(2) || ""
    ];

    // Append the row to the CSV
    await fs.appendFile(csvPath, row.join(",") + "\n", "utf8");

    return NextResponse.json({ ok: true, file: filename });

  } catch (error: any) {
    console.error("Save error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save data on server" }, 
      { status: 500 }
    );
  }
}