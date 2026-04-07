import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@trainerhub.com" },
    update: {},
    create: {
      email: "admin@trainerhub.com",
      password: await bcrypt.hash("admin123", 10),
      name: "Admin",
      role: Role.ADMIN,
    },
  });

  // Trainer
  const trainerUser = await prisma.user.upsert({
    where: { email: "trainer@trainerhub.com" },
    update: {},
    create: {
      email: "trainer@trainerhub.com",
      password: await bcrypt.hash("trainer123", 10),
      name: "Carlos Trainer",
      role: Role.TRAINER,
      trainer: {
        create: {
          bio: "Entrenador personal certificado con 5 años de experiencia",
          specialty: "Hipertrofia y pérdida de peso",
        },
      },
    },
    include: { trainer: true },
  });

  // Client
  const clientUser = await prisma.user.upsert({
    where: { email: "client@trainerhub.com" },
    update: {},
    create: {
      email: "client@trainerhub.com",
      password: await bcrypt.hash("client123", 10),
      name: "Juan Cliente",
      role: Role.CLIENT,
      client: {
        create: {
          trainerId: trainerUser.trainer!.id,
          goal: "Perder peso y ganar músculo",
          experience: "beginner",
          equipment: "gym",
          weight: 85,
          age: 28,
        },
      },
    },
  });

  console.log("Seed completed:", {
    admin: adminUser.email,
    trainer: trainerUser.email,
    client: clientUser.email,
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
