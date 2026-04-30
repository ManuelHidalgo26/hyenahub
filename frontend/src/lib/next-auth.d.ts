import { Role } from "@/types";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    error?: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      profileId: string;
      avatar?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    profileId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    profileId: string;
    error?: string;
    avatar?: string | null;
  }
}
