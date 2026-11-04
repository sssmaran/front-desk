// Server-only: self-created accounts, stored as a small JSON file.
// Prototype storage: one local process, bcrypt hashes, no email verification.
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";

interface Account {
  email: string; // normalized
  passwordHash: string;
  createdAt: string;
}

const FILE = process.env.ACCOUNTS_FILE
  ? path.resolve(process.env.ACCOUNTS_FILE)
  : path.join(process.cwd(), "data", "users.json");

async function readAll(): Promise<Account[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Account[];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e; // a corrupt file should fail loudly, not silently wipe accounts
  }
}

async function writeAll(accounts: Account[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(accounts, null, 2));
  await fs.rename(tmp, FILE); // atomic replace
}

// Serialize writes so two simultaneous signups can't both succeed.
const g = globalThis as unknown as { __frontDeskQueue?: Promise<unknown> };
function queued<T>(fn: () => Promise<T>): Promise<T> {
  const next = (g.__frontDeskQueue ?? Promise.resolve()).then(fn, fn);
  g.__frontDeskQueue = next.catch(() => undefined);
  return next;
}

export function createAccount(email: string, password: string): Promise<"created" | "exists"> {
  return queued(async () => {
    const accounts = await readAll();
    if (accounts.some((a) => a.email === email)) return "exists";
    accounts.push({ email, passwordHash: await bcrypt.hash(password, 10), createdAt: new Date().toISOString() });
    await writeAll(accounts);
    return "created";
  });
}

export async function verifyPassword(email: string, password: string): Promise<boolean> {
  const account = (await readAll()).find((a) => a.email === email);
  // Compare against a dummy hash when the account is missing, so timing is similar.
  const hash = account?.passwordHash ?? "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.QbZ3s8jYk1rRZ6s8m2Oe5cG6W6aW";
  const ok = await bcrypt.compare(password, hash);
  return Boolean(account) && ok;
}

export async function registeredEmails(): Promise<Set<string>> {
  return new Set((await readAll()).map((a) => a.email));
}
