import { PrismaClient, Role, SellerStatus, ProductStatus, AddressType, NotificationType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const salt = await bcrypt.genSalt(10);
  
  // Clean database in reverse-dependency order
  await prisma.inventory.deleteMany({});
  await prisma.productAttribute.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.sellerProfile.deleteMany({});
  await prisma.profile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned database.');

  // Create Users
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

  // Create Categories (Hierarchy)
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Gadgets, devices, and consumer electronics.',
    },
  });
  
  const smartphones = await prisma.category.create({
    data: {
      name: 'Smartphones & Accessories',
      slug: 'smartphones',
      description: 'Mobile phones, cases, and chargers.',
      parentId: electronics.id,
    },
  });

  const laptops = await prisma.category.create({
    data: {
      name: 'Laptops & Computers',
      slug: 'laptops',
      description: 'Notebooks, tablets, and desktop systems.',
      parentId: electronics.id,
    },
  });

  const fashion = await prisma.category.create({
    data: {
      name: 'Fashion & Apparel',
      slug: 'fashion',
      description: 'Clothing, footwear, and accessories.',
    },
  });

  const mensApparel = await prisma.category.create({
    data: {
      name: "Men's Apparel",
      slug: 'mens-apparel',
      description: 'Shirts, jeans, jackets for men.',
      parentId: fashion.id,
    },
  });

  const books = await prisma.category.create({
    data: {
      name: 'Books & Literature',
      slug: 'books',
      description: 'Fiction, non-fiction, academic textbooks.',
    },
  });
  console.log('Created categories hierarchy.');

  // Create Product 1: Simple Product (iPhone 15 Pro)
  const product1 = await prisma.product.create({
    data: {
      sellerId: approvedSeller.id,
      categoryId: smartphones.id,
      name: 'iPhone 15 Pro',
      slug: 'iphone-15-pro',
      description: 'The iPhone 15 Pro features a strong and light aerospace-grade titanium design with textured matte-glass back.',
      price: 999.99,
      sku: 'IPHONE-15-PRO-128GB',
      status: ProductStatus.PUBLISHED,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&q=80&w=600',
            altText: 'iPhone 15 Pro Titanium',
            isMain: true,
          },
        ],
      },
      attributes: {
        create: [
          { name: 'Brand', value: 'Apple' },
          { name: 'Color', value: 'Natural Titanium' },
          { name: 'Storage', value: '128GB' },
        ],
      },
      inventory: {
        create: {
          quantity: 50,
          lowStockThreshold: 5,
        },
      },
    },
  });
  console.log(`Created simple product: ${product1.name}`);

  // Create Product 2: Variant Product (Macbook Pro 16")
  const product2 = await prisma.product.create({
    data: {
      sellerId: approvedSeller.id,
      categoryId: laptops.id,
      name: 'Macbook Pro 16"',
      slug: 'macbook-pro-16',
      description: 'The ultimate pro laptop. With the M3 Pro or M3 Max chip, the MacBook Pro powers through demanding workflows.',
      price: 2499.00, // Base price
      status: ProductStatus.PUBLISHED,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600',
            altText: 'Macbook Pro Space Black',
            isMain: true,
          },
        ],
      },
      attributes: {
        create: [
          { name: 'Brand', value: 'Apple' },
          { name: 'Screen Size', value: '16.2 inch' },
        ],
      },
      variants: {
        create: [
          {
            sku: 'MACBOOK-M3PRO-512',
            price: 2499.00,
            name: 'M3 Pro / 18GB / 512GB',
            options: { Processor: 'M3 Pro', Memory: '18GB', Storage: '512GB' },
            inventory: {
              create: {
                quantity: 15,
                lowStockThreshold: 3,
              },
            },
          },
          {
            sku: 'MACBOOK-M3MAX-1TB',
            price: 3499.00,
            name: 'M3 Max / 36GB / 1TB',
            options: { Processor: 'M3 Max', Memory: '36GB', Storage: '1TB' },
            inventory: {
              create: {
                quantity: 8,
                lowStockThreshold: 2,
              },
            },
          },
        ],
      },
    },
  });
  console.log(`Created variant product: ${product2.name}`);

  // Create Product 3: Unapproved Seller Product (Pending Review)
  const product3 = await prisma.product.create({
    data: {
      sellerId: pendingSeller.id,
      categoryId: electronics.id,
      name: 'Premium Wireless Headphones',
      slug: 'premium-wireless-headphones',
      description: 'Experience immersive high-fidelity audio with active noise cancellation and 40-hour battery life.',
      price: 199.99,
      sku: 'HEADPHONES-PREMIUM-MOCK',
      status: ProductStatus.PENDING_REVIEW,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600',
            altText: 'Premium Wireless Headphones',
            isMain: true,
          },
        ],
      },
      inventory: {
        create: {
          quantity: 30,
          lowStockThreshold: 5,
        },
      },
    },
  });
  console.log(`Created pending review product: ${product3.name}`);

  // Create Product 4: Variant Product (Classic Denim Jacket)
  const product4 = await prisma.product.create({
    data: {
      sellerId: approvedSeller.id,
      categoryId: mensApparel.id,
      name: 'Classic Denim Jacket',
      slug: 'classic-denim-jacket',
      description: 'A timeless button-front denim jacket made from premium cotton denim with a relaxed fit.',
      price: 79.99,
      status: ProductStatus.PUBLISHED,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=600',
            altText: 'Blue Denim Jacket',
            isMain: true,
          },
        ],
      },
      variants: {
        create: [
          {
            sku: 'JACKET-BLUE-M',
            price: 79.99,
            name: 'Medium / Blue',
            options: { Size: 'M', Color: 'Blue' },
            inventory: {
              create: {
                quantity: 20,
                lowStockThreshold: 5,
              },
            },
          },
          {
            sku: 'JACKET-BLUE-L',
            price: 89.99, // Variant specific price override
            name: 'Large / Blue',
            options: { Size: 'L', Color: 'Blue' },
            inventory: {
              create: {
                quantity: 25,
                lowStockThreshold: 5,
              },
            },
          },
        ],
      },
    },
  });
  console.log(`Created variant product: ${product4.name}`);

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
