import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const isOwnerDemo = email === "owner@arya.test";
        const isStaffDemo = email === "staff@arya.test";
        const isDemoEmail = isOwnerDemo || isStaffDemo;

        // Instant response for demo accounts (zero DB latency or connection issues)
        if (isDemoEmail && password === "password123") {
          return {
            id: isOwnerDemo ? "demo-owner-id" : "demo-staff-id",
            name: isOwnerDemo ? "Demo Owner" : "Demo Staff",
            email,
            role: isOwnerDemo ? "OWNER" : "STAFF",
            isDemo: true,
          };
        }

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (user && user.isActive) {
            const valid = await bcrypt.compare(password, user.passwordHash);
            if (valid) {
              return {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isDemo: false,
              };
            }
          }
        } catch (err) {
          console.error("Auth DB query error:", err);
        }

        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.isDemo = Boolean(user.isDemo);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.isDemo = Boolean(token.isDemo);
      return session;
    },
  },
});
