import NextAuth from "next-auth";
import Osu from "next-auth/providers/osu";

export const { handlers, signIn, signOut, auth } = NextAuth({
   providers: [
      Osu({
         authorization: "https://osu.ppy.sh/oauth/authorize?scope=identify public"
      })
   ],
   callbacks: {
      jwt({ token, account }) {
         if (account) {
            token.accessToken = account.access_token;
            token.providerAccountId = account.providerAccountId;
         }
         return token;
      },
      session({ session, token }) {
         session.accessToken = token.accessToken;
         session.user.id = parseInt(token.providerAccountId);
         return session;
      }
   }
});
