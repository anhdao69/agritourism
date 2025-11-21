import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for long analysis

// FastAPI backend URL - can be configured via environment variable
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { geojson, year1, year2 } = body;

    if (!geojson) {
      return NextResponse.json(
        { error: "GeoJSON polygon is required" },
        { status: 400 }
      );
    }

    if (!year1 || !year2) {
      return NextResponse.json(
        { error: "Both year1 and year2 are required" },
        { status: 400 }
      );
    }

    // Forward request to FastAPI backend
    const response = await fetch(`${FASTAPI_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        geojson,
        year1,
        year2,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || `Analysis failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the zip file blob from FastAPI
    const zipBlob = await response.blob();

    // Return the zip file
    return new NextResponse(zipBlob, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="analysis_${year1}_${year2}.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}