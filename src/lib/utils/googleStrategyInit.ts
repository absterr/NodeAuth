import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { sequelize } from "../../db/db.js";
import { Account } from "../../db/models/account.model.js";
import { User } from "../../db/models/user.model.js";
import env from "./env.js";

const googleStrategyInit = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
      },
      async (_, __, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;

          if (!email) {
            throw new Error("Google account has no accessible email");
          }

          let user: User;
          const existingUser = await User.findOne({ where: { email } });
          const existingAccount = await Account.findOne({ where: { accountId: googleId } });

          if (existingUser && existingAccount) {
            user = existingUser;
          } else {
            if (existingUser && !existingAccount) {
              await Account.create({
                providerId: "google",
                userId: existingUser.id,
                accountId: googleId
              });

              user = existingUser;
            } else {
              const newUser = await sequelize.transaction(async (t) => {
                const newUser = await User.create(
                  { name, email, emailVerified: true }, { transaction: t }
                );

                await Account.create(
                  { providerId: "google", userId: newUser.id, accountId: googleId },
                  { transaction: t }
                );

                return newUser;
              });

              user = newUser;
            }
          }

          done(null, user);
        } catch (err) {
          done(err, undefined);
        }
      }
    )
  );
}

export default googleStrategyInit;
