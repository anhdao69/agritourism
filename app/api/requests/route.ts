// app/api/requests/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { auth } from "@/auth";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "requests");
const INDEX_FILE = path.join(DATA_DIR, "index.json");

type RequestItem = {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  subject: string;
  payload?: any;
  requestTime: string; // ISO
  action?: "APPROVED" | "REJECTED" | "PENDING" | null;
  actionTime?: string | null; // ISO
};

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(INDEX_FILE); } catch { await fs.writeFile(INDEX_FILE, "[]", "utf8"); }
}

async function readAll(): Promise<RequestItem[]> {
  await ensureDir();
  try {
    const buf = await fs.readFile(INDEX_FILE, "utf8");
    const list = JSON.parse(buf) as RequestItem[];
    // newest first
    return list.sort((a, b) => (a.requestTime < b.requestTime ? 1 : -1));
  } catch {
    return [];
  }
}

async function writeAll(items: RequestItem[]) {
  await fs.writeFile(INDEX_FILE, JSON.stringify(items, null, 2), "utf8");
}

// GET /api/requests[?all=1]
// - admins/editors: all items
// - others: only own items
export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  const me = session?.user as any | undefined;
  const role = me?.role as string | undefined;

  const { searchParams } = new URL(req.url);
  const wantAll = searchParams.get("all") === "1";

  const all = await readAll();
  const visible = wantAll && (role === "ADMIN" || role === "EDITOR")
    ? all
    : all.filter((r) => r.userId && me?.id && r.userId === me.id);

  return NextResponse.json({ requests: visible });
}

// POST /api/requests
// body: { subject: string, payload?: any }
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const me = session?.user as any | undefined;

  const { subject, payload } = await req.json().catch(() => ({}));
  if (!subject || typeof subject !== "string") {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = `${Date.now()}`;

  const item: RequestItem = {
    id,
    userId: me?.id ?? null,
    userEmail: me?.email ?? null,
    userName: me?.name ?? me?.email ?? "Anonymous",
    subject: subject.trim(),
    payload: payload ?? null,
    requestTime: now,
    action: "PENDING",
    actionTime: null,
  };

  const all = await readAll();
  all.push(item);
  await writeAll(all);

  return NextResponse.json({ ok: true, request: item });
}

// PATCH /api/requests
// body: { id: string, action: "APPROVED" | "REJECTED" | "PENDING" }
export async function PATCH(req: Request) {
  const session = await auth().catch(() => null);
  const me = session?.user as any | undefined;
  const role = me?.role as string | undefined;
  if (!(role === "ADMIN" || role === "EDITOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, action } = await req.json().catch(() => ({}));
  if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const all = await readAll();
  const idx = all.findIndex((r) => r.id === String(id));
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  all[idx].action = action;
  all[idx].actionTime = action === "PENDING" ? null : new Date().toISOString();

  await writeAll(all);
  return NextResponse.json({ ok: true, request: all[idx] });
}
