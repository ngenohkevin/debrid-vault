import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "changeme";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

function createToken(password: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("vault_session");

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const expectedToken = createToken(AUTH_PASSWORD);
  if (session.value !== expectedToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
