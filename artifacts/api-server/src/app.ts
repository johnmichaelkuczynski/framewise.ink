import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── Passport setup ───────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string;
      picture: string | null;
    }
  }
}

const callbackURL =
  process.env.GOOGLE_REDIRECT_URI ||
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`
    : "http://localhost:3000/api/auth/google/callback");

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ?? `${profile.id}@google.com`;
          const name = profile.displayName ?? "Unknown";
          const picture = profile.photos?.[0]?.value ?? null;

          // Upsert user
          const existing = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, profile.id))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(usersTable).values({
              id: profile.id,
              email,
              name,
              picture,
            });
          } else {
            await db
              .update(usersTable)
              .set({ name, picture })
              .where(eq(usersTable.id, profile.id));
          }

          done(null, { id: profile.id, email, name, picture });
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    if (rows.length === 0) {
      done(null, false);
      return;
    }
    const u = rows[0];
    done(null, { id: u.id, email: u.email, name: u.name, picture: u.picture ?? null });
  } catch (err) {
    done(err);
  }
});

// ─── App ─────────────────────────────────────────────────────────────────────

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "framewise-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true behind HTTPS in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", router);

export default app;
export { passport, callbackURL };
