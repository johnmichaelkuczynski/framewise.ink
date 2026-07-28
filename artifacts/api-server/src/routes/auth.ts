import { Router, type Request } from "express";
import passport from "passport";
import { requireAuth } from "../middlewares/auth";

const router = Router();

/**
 * Build the OAuth callback URL from the actual incoming request so it works
 * on any domain — dev, staging, or production — without any config changes.
 * The user still needs every domain registered in Google Cloud Console, but
 * the server no longer hardcodes a single URL.
 */
function getCallbackUrl(req: Request): string {
  // Replit (and most reverse-proxies) set x-forwarded-proto / x-forwarded-host
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0].trim() ??
    req.protocol;
  const host =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0].trim() ??
    req.get("host") ??
    "localhost";
  return `${proto}://${host}/api/auth/google/callback`;
}

// GET /auth/google — redirect to Google
router.get("/auth/google", (req, res, next): void => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    callbackURL: getCallbackUrl(req),
  })(req, res, next);
});

// GET /auth/google/callback — handle OAuth callback
router.get("/auth/google/callback", (req, res, next): void => {
  passport.authenticate("google", {
    failureRedirect: "/",
    callbackURL: getCallbackUrl(req),
  })(req, res, next);
}, (_req, res): void => {
  res.redirect("/");
});

// GET /auth/me — return current user (401 if not logged in — no redirect)
router.get("/auth/me", requireAuth, (req, res): void => {
  const u = req.user!;
  res.json({
    id: u.id,
    email: u.email,
    name: u.name,
    picture: u.picture ?? null,
    createdAt: new Date().toISOString(),
  });
});

// POST /auth/logout
router.post("/auth/logout", (req, res): void => {
  req.logout(() => {
    res.json({ success: true });
  });
});

export default router;
