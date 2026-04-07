import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Redirect to role-specific dashboard
  const roleRedirects: Record<string, string> = {
    ADMIN: "/admin",
    TRAINER: "/trainer",
    CLIENT: "/client",
  };

  redirect(roleRedirects[session.user.role] ?? "/login");
}
