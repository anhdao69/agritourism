// app/api/submissions/route.ts
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { auth } from "@/auth";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data", "submissions");
const INDEX = path.join(DATA_DIR, "index.json");

type Submission = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  formId: string;
  formName: string;
  data: any;
  submittedAt: string;  // ISO
  status: "PENDING" | "APPROVED" | "REJECTED";
  actionTime?: string | null; // ISO or null
  file: string; // saved json file path relative to /data/submissions
};

async function ensure() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(INDEX); } catch { await fs.writeFile(INDEX, "[]", "utf8"); }
}
async function readAll(): Promise<Submission[]> {
  await ensure();
  try { return JSON.parse(await fs.readFile(INDEX, "utf8")); } catch { return []; }
}
async function writeAll(items: Submission[]) {
  await fs.writeFile(INDEX, JSON.stringify(items, null, 2), "utf8");
}

// GET /api/submissions[?all=1]  → staff sees all, others see their own
export async function GET(req: Request) {
  const session = await auth().catch(() => null);
  const me = session?.user as any | undefined;

  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const wantAll = searchParams.get("all") === "1";
  const isStaff = me.role === "ADMIN" || me.role === "EDITOR";

  const items = await readAll();
  const visible = wantAll && isStaff ? items : items.filter(s => s.userId === me.id);

  // newest first
  visible.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  return NextResponse.json({ submissions: visible });
}

// POST /api/submissions  { formId, formName, data }
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const me = session?.user as any | undefined;

  if (!me) return NextResponse.json({ error: "Please sign in" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const formId = String(body.formId || "").trim();
  const formName = String(body.formName || "").trim();
  const data = body.data;

  if (!formName) return NextResponse.json({ error: "Missing formName" }, { status: 400 });

  const now = new Date().toISOString();
  const id = `${Date.now()}`;
  const file = `submission-${id}.json`;

  const submission: Submission = {
    id,
    userId: me.id,
    userEmail: me.email,
    userName: me.name || null,
    formId: formId || "custom",
    formName,
    data,
    submittedAt: now,
    status: "PENDING",
    actionTime: null,
    file,
  };

  // save the JSON file
  await ensure();
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(submission, null, 2), "utf8");

  // update index
  const all = await readAll();
  all.push(submission);
  await writeAll(all);

  return NextResponse.json({ ok: true, submission });
}

// PATCH /api/submissions  { id, status }
export async function PATCH(req: Request) {
  const session = await auth().catch(() => null);
  const me = session?.user as any | undefined;
  if (!(me && (me.role === "ADMIN" || me.role === "EDITOR"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status } = await req.json().catch(() => ({}));
  if (!id || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const all = await readAll();
  const i = all.findIndex(s => s.id === String(id));
  if (i < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  all[i].status = status;
  all[i].actionTime = status === "PENDING" ? null : new Date().toISOString();

  await writeAll(all);

  // also update on-disk file for convenience
  try {
    await fs.writeFile(path.join(DATA_DIR, all[i].file), JSON.stringify(all[i], null, 2), "utf8");
  } catch {}

  return NextResponse.json({ ok: true, submission: all[i] });
}
