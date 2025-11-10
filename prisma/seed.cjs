// prisma/seed.cjs
const { PrismaClient, Role } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const pwd   = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
  const hash  = await bcrypt.hash(pwd, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      passwordHash: hash,
      emailVerified: new Date(),
      deletedAt: null,
      name: "Site Admin",
    },
    create: {
      email,
      name: "Site Admin",
      passwordHash: hash,
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });

  // add into prisma/seed.cjs (optional example at end of main())
await prisma.listing.upsert({
  where: { slug: "miller-family-farm" },
  update: {},
  create: {
    name: "Miller Family Farm",
    slug: "miller-family-farm",
    shortIntro: "U-pick apples & cozy weekend events",
    status: "PUBLISHED",
  },
});

  console.log("Admin ensured at:", email);
}




main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
