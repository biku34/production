import { dbConnect } from "@/lib/mongoose";
import { ok, fail, handle } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/session";
import User from "@/models/User";
import type { Role, Stage } from "@/lib/domain";

export const dynamic = "force-dynamic";

// POST /api/auth/login  { username, password }
export const POST = handle(async (req) => {
  await dbConnect();
  const { username, password } = await req.json();
  if (!username || !password) return fail("Username and password are required");

  // passwordHash is select:false — ask for it explicitly.
  const user = await User.findOne({
    username: String(username).trim().toLowerCase(),
  }).select("+passwordHash");

  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return fail("Invalid username or password", 401);
  }

  const token = await signSession({
    uid: String(user._id),
    name: user.name,
    username: user.username as string,
    role: user.role as Role,
    stages: (user.stages as Stage[]) ?? [],
  });

  const res = ok({
    uid: String(user._id),
    name: user.name,
    username: user.username,
    role: user.role,
    stages: user.stages ?? [],
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
});
