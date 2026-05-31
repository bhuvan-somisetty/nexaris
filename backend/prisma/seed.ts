import { PrismaClient, Role, SellerStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  
  // Clean database in reverse-dependency order
  await prisma.refreshToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.sellerProfile.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned database.');

  // Create Admin
  const adminHash = await bcrypt.hash('adminpassword', salt);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@nexaris.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
      profile: {
        create: {
          firstName: 'Platform',
          lastName: 'Administrator',
        },
      },
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create Customer
  const customerHash = await bcrypt.hash('customerpassword', salt);
  const customer = await prisma.user.create({
    data: {
      email: 'customer@nexaris.com',
      passwordHash: customerHash,
      role: Role.CUSTOMER,
      profile: {
        create: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        },
      },
    },
  });
  console.log(`Created customer user: ${customer.email}`);

  // Create Pending Seller
  const pendingSellerHash = await bcrypt.hash('sellerpassword', salt);
  const pendingSeller = await prisma.user.create({
    data: {
      email: 'seller@nexaris.com',
      passwordHash: pendingSellerHash,
      role: Role.SELLER,
      profile: {
        create: {
          firstName: 'Alice',
          lastName: 'Smith',
        },
      },
      sellerProfile: {
        create: {
          storeName: 'Alice Tech Emporium',
          storeDescription: 'Innovative electronics and accessories.',
          status: SellerStatus.PENDING,
        },
      },
    },
  });
  console.log(`Created pending seller: ${pendingSeller.email}`);

  // Create Approved Seller
  const approvedSellerHash = await bcrypt.hash('approvedsellerpassword', salt);
  const approvedSeller = await prisma.user.create({
    data: {
      email: 'approvedseller@nexaris.com',
      passwordHash: approvedSellerHash,
      role: Role.SELLER,
      profile: {
        create: {
          firstName: 'Bob',
          lastName: 'Johnson',
        },
      },
      sellerProfile: {
        create: {
          storeName: 'Bob Book Bazaar',
          storeDescription: 'Pre-owned and rare books collection.',
          status: SellerStatus.APPROVED,
        },
      },
    },
  });
  console.log(`Created approved seller: ${approvedSeller.email}`);

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
