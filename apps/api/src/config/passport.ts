import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "./env";
import * as authService from "../modules/auth/auth.service";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.CLIENT_ID,
      clientSecret: env.CLIENT_SECRET,
      callbackURL: env.CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, _accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("Google profile did not include an email address"));
        }

        const userType = typeof req.query.state === "string" ? req.query.state : undefined;
        const user = await authService.findOrCreateGoogleUser({
          email,
          name: profile.displayName,
          userType,
        });
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ),
);

export default passport;
