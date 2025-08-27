import { PrismaClient } from '@prisma/client';
import { DEFAULT_SPECIES } from '../src/lib/forest';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed tree species
  for (const species of DEFAULT_SPECIES) {
    await prisma.treeSpecies.upsert({
      where: { id: species.id },
      update: {},
      create: {
        id: species.id,
        name: species.name,
        stages: species.stages,
        unlock_cost: species.unlock_cost,
        art_refs: JSON.stringify(species.art_refs),
      },
    });
  }

  // Create a demo user if it doesn't exist
  await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      auth_provider: 'demo',
      points: 100, // Start with some points
      streak_days: 0,
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
