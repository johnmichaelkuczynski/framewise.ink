import { Router } from "express";
import passport from "passport";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /auth/google — redirect to Google
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

// GET /auth/google/callback — handle OAuth callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (_req, res): void => {
    res.redirect("/");
  },
);

// GET /auth/me — return current user
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
