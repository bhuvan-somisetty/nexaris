import { PrismaClient, Role, SellerStatus, ProductStatus, AddressType, NotificationType, NotificationChannel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Ensure extensions and indexes exist
  console.log('Initializing Postgres extensions and custom GIN indexes...');
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS product_fts_idx ON "Product" USING gin(to_tsvector('english', name || ' ' || description))`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON "Product" USING gin (name gin_trgm_ops)`);

  const salt = await bcrypt.genSalt(10);
  
  // Clean database in reverse-dependency order
  await prisma.searchClickLog.deleteMany({});
  await prisma.searchQueryLog.deleteMany({});
  await prisma.searchHistory.deleteMany({});
  await prisma.searchSynonym.deleteMany({});
  await prisma.referral.deleteMany({});
  await prisma.referralCode.deleteMany({});
  await prisma.loyaltyHistory.deleteMany({});
  await prisma.loyaltyProfile.deleteMany({});
  await prisma.couponRedemption.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.campaignProduct.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.userSegment.deleteMany({});
  await prisma.userActivity.deleteMany({});

  await prisma.inventory.deleteMany({});
  await prisma.productAttribute.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notificationDeliveryLog.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.notificationTemplate.deleteMany({});
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
      price: 129999.00,
      originalPrice: 149900.00,
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
      price: 249900.00, // Base price
      originalPrice: 279900.00,
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
            price: 249900.00,
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
            price: 349900.00,
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
      price: 14999.00,
      originalPrice: 19999.00,
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
      price: 2999.00,
      originalPrice: 4499.00,
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
            price: 2999.00,
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
            price: 3499.00, // Variant specific price override
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

  // ── Marketplace catalog: 2000+ unique products across realistic categories ──
  console.log('Building realistic marketplace catalog...');

  function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  // Deterministic PRNG so the catalog is stable across re-seeds
  function rng(seed: number) {
    let t = (seed + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function nicePrice(min: number, max: number, seed: number) {
    const raw = min + rng(seed) * (max - min);
    let p: number;
    if (raw < 100) p = Math.round(raw / 10) * 10 - 1;
    else if (raw < 1000) p = Math.round(raw / 50) * 50 - 1;
    else if (raw < 10000) p = Math.round(raw / 100) * 100 - 1;
    else if (raw < 100000) p = Math.round(raw / 500) * 500 - 1;
    else p = Math.round(raw / 1000) * 1000 - 1;
    return Math.max(9, p);
  }

  // Extra approved seller stores for marketplace variety
  const sellerStores = [
    { store: 'TrendThreads', desc: 'Fashion-forward apparel and accessories.' },
    { store: 'GadgetHub', desc: 'Latest electronics and smart devices.' },
    { store: 'HomeNest Living', desc: 'Furniture, kitchen and home essentials.' },
    { store: 'PlayZone', desc: 'Sports gear, toys and outdoor fun.' },
    { store: 'PageTurner', desc: 'Books across every genre.' },
  ];
  const extraSellers: any[] = [];
  for (const ss of sellerStores) {
    const u = await prisma.user.create({
      data: {
        email: `seller.${slugify(ss.store)}@nexaris.com`,
        passwordHash: approvedSellerHash,
        role: Role.SELLER,
        profile: { create: { firstName: ss.store, lastName: 'Store' } },
        sellerProfile: { create: { storeName: ss.store, storeDescription: ss.desc, status: SellerStatus.APPROVED } },
      },
    });
    extraSellers.push(u);
  }
  const allSellers: any[] = [approvedSeller, ...extraSellers];

  // Reviewer pool so products carry real ratings + review counts
  const reviewers: any[] = [];
  for (let r = 0; r < 16; r++) {
    const u = await prisma.user.create({
      data: {
        email: `reviewer${r + 1}@nexaris.com`,
        passwordHash: customerHash,
        role: Role.CUSTOMER,
        profile: { create: { firstName: `Reviewer${r + 1}`, lastName: 'Verified' } },
      },
    });
    reviewers.push(u);
  }
  const reviewTitles = ['Great value for money', 'Highly recommended', 'Exactly as described', 'Loved it', 'Good quality', 'Worth the price', 'Satisfied with purchase', 'Excellent!', 'Will buy again', 'Nice product'];
  const reviewBodies = ['Quality is great and delivery was fast.', 'Exceeded my expectations for the price.', 'Works perfectly, very happy with it.', 'Good build quality and looks premium.', 'Does the job well, no complaints.', 'Packaging was neat and the product is genuine.', 'Comfortable and well made.', 'Value for money, would recommend to friends.'];

  // Extra parent categories (reuse existing fashion / electronics / books)
  const womensCat = await prisma.category.create({ data: { name: "Women's Fashion", slug: 'womens-fashion', description: 'Apparel and accessories for women.', parentId: fashion.id } });
  const beautyCat = await prisma.category.create({ data: { name: 'Beauty', slug: 'beauty', description: 'Makeup and skincare essentials.' } });
  const homeCat = await prisma.category.create({ data: { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Furniture, kitchen, appliances and decor.' } });
  const sportsCat = await prisma.category.create({ data: { name: 'Sports & Fitness', slug: 'sports-fitness', description: 'Sports gear and fitness equipment.' } });
  const autoCat = await prisma.category.create({ data: { name: 'Automotive', slug: 'automotive', description: 'Bike and car accessories.' } });
  const kidsCat = await prisma.category.create({ data: { name: 'Kids', slug: 'kids', description: 'Kids clothing, toys and school essentials.' } });

  const B = {
    menFashion: ['Allen Solly', 'Peter England', "Levi's", 'U.S. Polo Assn.', 'Roadster', 'HRX', 'Jack & Jones', 'Wrangler'],
    womenFashion: ['Biba', 'W for Woman', 'Libas', 'Aurelia', 'Vero Moda', 'ONLY', 'Global Desi', 'FabIndia'],
    footwear: ['Nike', 'Adidas', 'Puma', 'Bata', 'Woodland', 'Skechers', 'Campus', 'Red Tape'],
    watches: ['Titan', 'Fossil', 'Casio', 'Fastrack', 'Sonata', 'Timex', 'Daniel Wellington', 'Noise'],
    bags: ['American Tourister', 'Wildcraft', 'Skybags', 'Lavie', 'Baggit', 'Caprese', 'Safari', 'VIP'],
    beauty: ['Lakmé', 'Maybelline', 'Mamaearth', "L'Oréal", 'Plum', 'SUGAR', 'Biotique', 'Nykaa'],
    phones: ['Samsung', 'Apple', 'OnePlus', 'Xiaomi', 'Realme', 'vivo', 'OPPO', 'Motorola'],
    laptops: ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Apple', 'MSI', 'Samsung'],
    tablets: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Realme', 'Honor'],
    audio: ['boAt', 'Sony', 'JBL', 'Sennheiser', 'Noise', 'Boult', 'Marshall', 'Bose'],
    cameras: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'GoPro', 'Panasonic'],
    gaming: ['Sony', 'Microsoft', 'Nintendo', 'Logitech', 'Razer', 'ASUS ROG'],
    monitors: ['LG', 'Samsung', 'Dell', 'BenQ', 'Acer', 'ViewSonic'],
    furniture: ['Urban Ladder', 'Pepperfry', 'Nilkamal', 'Godrej Interio', 'Wakefit', 'Sleepwell'],
    kitchen: ['Prestige', 'Hawkins', 'Pigeon', 'Milton', 'Cello', 'Borosil', 'Butterfly'],
    appliances: ['LG', 'Samsung', 'Whirlpool', 'Bosch', 'Haier', 'Voltas', 'IFB'],
    decor: ['Home Centre', 'Chumbak', '@home', 'Ellementry', "D'Decor"],
    sports: ['Nike', 'Adidas', 'SG', 'SS', 'Cosco', 'Nivia', 'Yonex', 'Decathlon'],
    automotive: ['Bosch', 'Michelin', 'MRF', 'Castrol', 'Steelbird', 'Studds', '3M', 'Amaron'],
    kids: ['FirstCry', 'Hopscotch', 'Mothercare', 'Chicco', 'Babyhug'],
    toys: ['LEGO', 'Funskool', 'Hot Wheels', 'Hasbro', 'Mattel'],
    pubProg: ["O'Reilly", 'Manning', 'Packt', 'Pearson', 'Apress', 'No Starch Press'],
    pubFic: ['Penguin', 'HarperCollins', 'Bloomsbury', 'Rupa', 'Vintage'],
    pubAcad: ['Pearson', 'Wiley', 'McGraw Hill', 'Oxford', 'Cengage'],
    pubBiz: ['Harper Business', 'Penguin', 'Wiley', 'Portfolio'],
  };

  const px = (k: string, n: number) => `https://picsum.photos/seed/${k}${n}/600/600`;
  const POOLS: Record<string, string[]> = {
    shirts: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?auto=format&fit=crop&q=80&w=600'],
    tshirts: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&q=80&w=600'],
    jackets: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?auto=format&fit=crop&q=80&w=600'],
    jeans: ['https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&q=80&w=600'],
    footwear: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&q=80&w=600'],
    watches: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&q=80&w=600'],
    bags: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=600'],
    dresses: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=600'],
    saree: [px('saree', 1), px('saree', 2), px('saree', 3), px('saree', 4)],
    beauty: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=600'],
    phone: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?auto=format&fit=crop&q=80&w=600'],
    laptop: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=600'],
    tablet: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&q=80&w=600', px('tablet', 3), px('tablet', 4)],
    monitor: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1547119957-637f8679db1e?auto=format&fit=crop&q=80&w=600', px('monitor', 4)],
    audio: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=600'],
    camera: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1495707902641-75cac588d2e9?auto=format&fit=crop&q=80&w=600', px('camera', 4)],
    gaming: ['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1612801799890-4ba4760b6590?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600', px('gaming', 4)],
    furniture: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&q=80&w=600'],
    kitchen: ['https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=600', px('kitchen', 3), px('kitchen', 4)],
    appliances: ['https://images.unsplash.com/photo-1571175432247-52319df65045?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&q=80&w=600', px('appliance', 4)],
    decor: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?auto=format&fit=crop&q=80&w=600', px('decor', 3), px('decor', 4)],
    sports: ['https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=600', px('sports', 3), px('sports', 4)],
    cycling: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=600', px('cycle', 3), px('cycle', 4)],
    books: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=600'],
    automotive: [px('auto', 1), px('auto', 2), px('auto', 3), px('auto', 4)],
    kids: [px('kids', 1), px('kids', 2), px('kids', 3), px('kids', 4)],
    toys: [px('toys', 1), px('toys', 2), px('toys', 3), px('toys', 4)],
    school: [px('school', 1), px('school', 2), px('school', 3), px('school', 4)],
  };

  type Sub = { name: string; parentId: string; brand: string[]; types: string[]; min: number; max: number; pool: string; seller: number; id?: string };
  const SUBS: Sub[] = [
    { name: "Men's Shirts", parentId: fashion.id, brand: B.menFashion, types: ['Slim Fit Shirt', 'Casual Shirt', 'Formal Shirt', 'Checked Shirt', 'Linen Shirt', 'Oxford Shirt'], min: 399, max: 2499, pool: 'shirts', seller: 0 },
    { name: "Men's T-Shirts", parentId: fashion.id, brand: B.menFashion, types: ['Round Neck T-Shirt', 'Polo T-Shirt', 'Henley T-Shirt', 'Graphic Tee', 'V-Neck T-Shirt', 'Oversized Tee'], min: 199, max: 1499, pool: 'tshirts', seller: 0 },
    { name: "Men's Jackets", parentId: fashion.id, brand: B.menFashion, types: ['Bomber Jacket', 'Denim Jacket', 'Puffer Jacket', 'Hooded Jacket', 'Windcheater', 'Biker Jacket'], min: 999, max: 7999, pool: 'jackets', seller: 0 },
    { name: "Men's Jeans", parentId: fashion.id, brand: B.menFashion, types: ['Slim Fit Jeans', 'Regular Jeans', 'Skinny Jeans', 'Tapered Jeans', 'Straight Fit Jeans'], min: 699, max: 3499, pool: 'jeans', seller: 0 },
    { name: "Men's Trousers", parentId: fashion.id, brand: B.menFashion, types: ['Chinos', 'Formal Trousers', 'Cargo Pants', 'Joggers', 'Track Pants'], min: 599, max: 2999, pool: 'jeans', seller: 0 },
    { name: "Men's Shorts", parentId: fashion.id, brand: B.menFashion, types: ['Cotton Shorts', 'Denim Shorts', 'Cargo Shorts', 'Sports Shorts'], min: 299, max: 1499, pool: 'tshirts', seller: 0 },
    { name: "Men's Innerwear", parentId: fashion.id, brand: B.menFashion, types: ['Vest Pack', 'Brief Pack', 'Trunk Pack', 'Boxer Pack'], min: 199, max: 999, pool: 'tshirts', seller: 0 },
    { name: "Men's Footwear", parentId: fashion.id, brand: B.footwear, types: ['Running Shoes', 'Sneakers', 'Formal Shoes', 'Loafers', 'Sports Shoes', 'Casual Shoes'], min: 799, max: 7999, pool: 'footwear', seller: 0 },
    { name: 'Watches', parentId: fashion.id, brand: B.watches, types: ['Analog Watch', 'Digital Watch', 'Chronograph Watch', 'Automatic Watch', 'Dress Watch'], min: 999, max: 29999, pool: 'watches', seller: 0 },
    { name: 'Sarees', parentId: womensCat.id, brand: B.womenFashion, types: ['Silk Saree', 'Cotton Saree', 'Georgette Saree', 'Banarasi Saree', 'Chiffon Saree'], min: 699, max: 14999, pool: 'saree', seller: 0 },
    { name: 'Kurtis', parentId: womensCat.id, brand: B.womenFashion, types: ['Anarkali Kurti', 'Straight Kurti', 'A-Line Kurti', 'Printed Kurti', 'Embroidered Kurti'], min: 399, max: 2999, pool: 'dresses', seller: 0 },
    { name: "Women's Tops", parentId: womensCat.id, brand: B.womenFashion, types: ['Casual Top', 'Crop Top', 'Peplum Top', 'Tunic Top', 'Off-Shoulder Top'], min: 299, max: 1999, pool: 'tshirts', seller: 0 },
    { name: 'Dresses', parentId: womensCat.id, brand: B.womenFashion, types: ['Maxi Dress', 'Bodycon Dress', 'A-Line Dress', 'Wrap Dress', 'Skater Dress'], min: 599, max: 4999, pool: 'dresses', seller: 0 },
    { name: "Women's Jeans", parentId: womensCat.id, brand: B.womenFashion, types: ['Skinny Jeans', 'High-Waist Jeans', 'Mom Jeans', 'Bootcut Jeans'], min: 699, max: 3499, pool: 'jeans', seller: 0 },
    { name: 'Handbags', parentId: womensCat.id, brand: B.bags, types: ['Tote Bag', 'Sling Bag', 'Shoulder Bag', 'Clutch', 'Mini Backpack'], min: 599, max: 7999, pool: 'bags', seller: 0 },
    { name: "Women's Footwear", parentId: womensCat.id, brand: B.footwear, types: ['Heels', 'Flats', 'Sandals', 'Wedges', 'Sneakers'], min: 499, max: 4999, pool: 'footwear', seller: 0 },
    { name: 'Makeup', parentId: beautyCat.id, brand: B.beauty, types: ['Lipstick', 'Foundation', 'Kajal', 'Compact Powder', 'Eyeliner', 'Mascara'], min: 149, max: 1999, pool: 'beauty', seller: 0 },
    { name: 'Skincare', parentId: beautyCat.id, brand: B.beauty, types: ['Face Wash', 'Moisturizer', 'Sunscreen', 'Face Serum', 'Night Cream'], min: 199, max: 2499, pool: 'beauty', seller: 0 },
    { name: 'Smartphones', parentId: smartphones.id, brand: B.phones, types: ['5G Smartphone', 'Pro Smartphone', 'Lite Smartphone', 'Ultra Smartphone', 'Note Smartphone'], min: 6999, max: 159999, pool: 'phone', seller: 1 },
    { name: 'Laptops', parentId: laptops.id, brand: B.laptops, types: ['Thin & Light Laptop', 'Gaming Laptop', 'Business Laptop', '2-in-1 Laptop', 'Ultrabook'], min: 28999, max: 399999, pool: 'laptop', seller: 1 },
    { name: 'Tablets', parentId: electronics.id, brand: B.tablets, types: ['Android Tablet', 'Pro Tablet', 'Lite Tablet', 'Kids Tablet'], min: 7999, max: 99999, pool: 'tablet', seller: 1 },
    { name: 'Monitors', parentId: electronics.id, brand: B.monitors, types: ['Full HD Monitor', '4K Monitor', 'Curved Monitor', 'Gaming Monitor', 'UltraWide Monitor'], min: 6999, max: 89999, pool: 'monitor', seller: 1 },
    { name: 'Headphones', parentId: electronics.id, brand: B.audio, types: ['Over-Ear Headphones', 'Wireless Headphones', 'Noise Cancelling Headphones', 'Gaming Headset'], min: 999, max: 39999, pool: 'audio', seller: 1 },
    { name: 'Earbuds', parentId: electronics.id, brand: B.audio, types: ['True Wireless Earbuds', 'Sports Earbuds', 'ANC Earbuds', 'Gaming Earbuds'], min: 799, max: 24999, pool: 'audio', seller: 1 },
    { name: 'Smartwatches', parentId: electronics.id, brand: B.watches, types: ['Fitness Smartwatch', 'AMOLED Smartwatch', 'GPS Smartwatch', 'Calling Smartwatch'], min: 1499, max: 49999, pool: 'watches', seller: 1 },
    { name: 'Cameras', parentId: electronics.id, brand: B.cameras, types: ['DSLR Camera', 'Mirrorless Camera', 'Action Camera', 'Instant Camera', 'Vlogging Camera'], min: 4999, max: 499999, pool: 'camera', seller: 1 },
    { name: 'Gaming', parentId: electronics.id, brand: B.gaming, types: ['Gaming Console', 'Wireless Controller', 'Gaming Keyboard', 'Gaming Mouse', 'VR Headset'], min: 1999, max: 54999, pool: 'gaming', seller: 1 },
    { name: 'Furniture', parentId: homeCat.id, brand: B.furniture, types: ['Office Chair', 'Study Table', 'Bookshelf', 'Coffee Table', 'Wardrobe', 'Bed Frame'], min: 2999, max: 89999, pool: 'furniture', seller: 2 },
    { name: 'Kitchen', parentId: homeCat.id, brand: B.kitchen, types: ['Pressure Cooker', 'Non-Stick Cookware Set', 'Mixer Grinder', 'Dinner Set', 'Knife Set'], min: 499, max: 9999, pool: 'kitchen', seller: 2 },
    { name: 'Appliances', parentId: homeCat.id, brand: B.appliances, types: ['Microwave Oven', 'Air Fryer', 'Refrigerator', 'Washing Machine', 'Air Conditioner', 'Water Purifier'], min: 4999, max: 79999, pool: 'appliances', seller: 2 },
    { name: 'Home Decor', parentId: homeCat.id, brand: B.decor, types: ['Wall Clock', 'Table Lamp', 'Photo Frame Set', 'Decorative Vase', 'Wall Art', 'Scented Candle Set'], min: 299, max: 4999, pool: 'decor', seller: 2 },
    { name: 'Storage', parentId: homeCat.id, brand: B.decor, types: ['Storage Box Set', 'Wardrobe Organizer', 'Shoe Rack', 'Laundry Basket', 'Foldable Storage'], min: 299, max: 3999, pool: 'decor', seller: 2 },
    { name: 'Cricket', parentId: sportsCat.id, brand: B.sports, types: ['Cricket Bat', 'Cricket Ball Pack', 'Batting Gloves', 'Cricket Kit Bag', 'Wicket Keeping Pads'], min: 299, max: 14999, pool: 'sports', seller: 3 },
    { name: 'Football', parentId: sportsCat.id, brand: B.sports, types: ['Football', 'Football Studs', 'Goalkeeper Gloves', 'Shin Guards'], min: 299, max: 5999, pool: 'sports', seller: 3 },
    { name: 'Gym & Fitness', parentId: sportsCat.id, brand: B.sports, types: ['Dumbbell Set', 'Yoga Mat', 'Resistance Bands', 'Skipping Rope', 'Kettlebell'], min: 299, max: 9999, pool: 'sports', seller: 3 },
    { name: 'Cycling', parentId: sportsCat.id, brand: B.sports, types: ['Mountain Bike', 'Road Bike', 'Cycling Helmet', 'Bike Light Set', 'Cycling Gloves'], min: 499, max: 49999, pool: 'cycling', seller: 3 },
    { name: 'Programming Books', parentId: books.id, brand: B.pubProg, types: ['Guide to Python', 'Mastering JavaScript', 'Clean Code Handbook', 'System Design Primer', 'Algorithms Unlocked', 'Machine Learning Basics'], min: 299, max: 2999, pool: 'books', seller: 4 },
    { name: 'Fiction', parentId: books.id, brand: B.pubFic, types: ['Mystery Novel', 'Romance Novel', 'Thriller Novel', 'Fantasy Epic', 'Historical Fiction'], min: 149, max: 999, pool: 'books', seller: 4 },
    { name: 'Academic', parentId: books.id, brand: B.pubAcad, types: ['Engineering Textbook', 'Physics Reference', 'Mathematics Guide', 'Chemistry Handbook', 'Economics Textbook'], min: 199, max: 1999, pool: 'books', seller: 4 },
    { name: 'Business Books', parentId: books.id, brand: B.pubBiz, types: ['Leadership Bestseller', 'Startup Playbook', 'Investing Guide', 'Marketing Strategy', 'Productivity Manual'], min: 199, max: 1499, pool: 'books', seller: 4 },
    { name: 'Bike Accessories', parentId: autoCat.id, brand: B.automotive, types: ['Helmet', 'Bike Cover', 'Mobile Mount', 'Tank Bag', 'LED Headlight'], min: 299, max: 9999, pool: 'automotive', seller: 1 },
    { name: 'Car Accessories', parentId: autoCat.id, brand: B.automotive, types: ['Car Phone Holder', 'Seat Cover Set', 'Dash Cam', 'Car Vacuum Cleaner', 'Air Freshener Pack'], min: 199, max: 14999, pool: 'automotive', seller: 1 },
    { name: 'Boys Clothing', parentId: kidsCat.id, brand: B.kids, types: ['Boys T-Shirt', 'Boys Shirt', 'Boys Jeans', 'Boys Shorts Set'], min: 299, max: 1999, pool: 'kids', seller: 3 },
    { name: 'Girls Clothing', parentId: kidsCat.id, brand: B.kids, types: ['Girls Frock', 'Girls Top & Skirt', 'Girls Leggings Set', 'Girls Party Dress'], min: 299, max: 2499, pool: 'kids', seller: 3 },
    { name: 'School Essentials', parentId: kidsCat.id, brand: B.kids, types: ['School Backpack', 'Lunch Box', 'Kids Water Bottle', 'Geometry Box', 'Pencil Case'], min: 149, max: 1999, pool: 'school', seller: 3 },
    { name: 'Toys', parentId: kidsCat.id, brand: B.toys, types: ['Building Blocks Set', 'Remote Control Car', 'Soft Toy', 'Puzzle Game', 'Action Figure'], min: 199, max: 4999, pool: 'toys', seller: 3 },
  ];

  // Create subcategories
  for (const sub of SUBS) {
    const c = await prisma.category.create({
      data: { name: sub.name, slug: slugify(sub.name) + '-cat', description: `${sub.name} — shop the latest on Nexaris.`, parentId: sub.parentId },
    });
    sub.id = c.id;
  }

  const colors = ['Black', 'White', 'Navy', 'Grey', 'Blue', 'Maroon', 'Olive', 'Beige', 'Teal', 'Charcoal'];
  const usedSlugs = new Set<string>();
  const usedSkus = new Set<string>();
  const usedNames = new Set<string>();
  const productData: any[] = [];
  const TARGET = 2000;
  const perSub = Math.ceil((TARGET + SUBS.length) / SUBS.length);
  let counter = 0;

  for (const sub of SUBS) {
    for (let n = 0; n < perSub; n++) {
      counter++;
      const brand = sub.brand[n % sub.brand.length];
      const type = sub.types[Math.floor(n / sub.brand.length) % sub.types.length];
      const color = colors[counter % colors.length];
      const modelCode = `${brand.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${1000 + counter}`;
      let name = `${brand} ${type} – ${color} (${modelCode})`;
      while (usedNames.has(name)) name = `${brand} ${type} – ${color} (${modelCode}-${counter})`;
      usedNames.add(name);
      let slug = slugify(name);
      while (usedSlugs.has(slug)) slug = `${slug}-${counter}`;
      usedSlugs.add(slug);
      let sku = modelCode;
      while (usedSkus.has(sku)) sku = `${sku}-${counter}`;
      usedSkus.add(sku);

      const price = nicePrice(sub.min, sub.max, counter);
      const markup = 1.1 + ((counter % 11) * 0.04); // 10%–50%
      const originalPrice = Math.max(price + 1, Math.round((price * markup) / 10) * 10 - 1);
      const pool = POOLS[sub.pool] || POOLS.books;
      const image = pool[n % pool.length];
      const seller = allSellers[sub.seller % allSellers.length];

      const numReviews = Math.floor(rng(counter * 7) * 6); // 0–5
      const revs: any[] = [];
      for (let k = 0; k < numReviews; k++) {
        const rv = reviewers[(counter + k) % reviewers.length];
        const rating = 3 + Math.floor(rng(counter * 13 + k) * 3); // 3–5
        revs.push({ customerId: rv.id, rating, title: reviewTitles[(counter + k) % reviewTitles.length], content: reviewBodies[(counter + k) % reviewBodies.length], verified: true });
      }

      productData.push({
        sellerId: seller.id,
        categoryId: sub.id!,
        name,
        slug,
        description: `${brand} ${type} in ${color}. Crafted for everyday use with premium materials and a comfortable, durable finish. Model ${modelCode}. Backed by the Nexaris Buyer Protection Guarantee with easy 7-day returns.`,
        price,
        originalPrice,
        sku,
        status: ProductStatus.PUBLISHED,
        images: { create: [{ url: image, altText: name, isMain: true }] },
        attributes: { create: [{ name: 'Brand', value: brand }, { name: 'Type', value: type }, { name: 'Color', value: color }, { name: 'Condition', value: 'New' }] },
        inventory: { create: { quantity: 10 + (counter % 200), lowStockThreshold: 5 } },
        ...(revs.length ? { reviews: { create: revs } } : {}),
      });
    }
  }

  console.log(`Inserting ${productData.length} unique products in batches...`);
  for (let idx = 0; idx < productData.length; idx += 50) {
    const batch = productData.slice(idx, idx + 50);
    await Promise.all(batch.map((p) => prisma.product.create({ data: p })));
    console.log(` -> Inserted ${Math.min(idx + 50, productData.length)} / ${productData.length}`);
  }


  // Seeding default notification templates
  const templatesData = [
    // ORDER_CREATED
    {
      type: NotificationType.ORDER_CREATED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Order Placed',
      bodyTemplate: 'Your order {{orderId}} has been created and is awaiting payment.',
    },
    {
      type: NotificationType.ORDER_CREATED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Order {{orderId}} Placed',
      bodyTemplate: 'Hello {{name}}, your order {{orderId}} has been successfully placed. Amount: ₹{{amount}}. Please complete your payment within 15 minutes.',
    },
    // ORDER_CONFIRMED
    {
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Order Confirmed',
      bodyTemplate: 'Your order {{orderId}} has been confirmed and is processing.',
    },
    {
      type: NotificationType.ORDER_CONFIRMED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Order {{orderId}} Confirmed',
      bodyTemplate: 'Hello {{name}}, your payment for order {{orderId}} was successful. Your order is now confirmed and is being processed by our sellers.',
    },
    // ORDER_SHIPPED
    {
      type: NotificationType.ORDER_SHIPPED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Order Shipped',
      bodyTemplate: 'Your order {{orderId}} has been shipped!',
    },
    {
      type: NotificationType.ORDER_SHIPPED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Order {{orderId}} Dispatched',
      bodyTemplate: 'Hello {{name}}, items in your order {{orderId}} have been shipped and are on the way.',
    },
    // ORDER_DELIVERED
    {
      type: NotificationType.ORDER_DELIVERED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Order Delivered',
      bodyTemplate: 'Your order {{orderId}} has been delivered.',
    },
    {
      type: NotificationType.ORDER_DELIVERED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Order {{orderId}} Delivered',
      bodyTemplate: 'Hello {{name}}, your order {{orderId}} has been delivered successfully. Thank you for shopping with Nexaris!',
    },
    // ORDER_CANCELLED
    {
      type: NotificationType.ORDER_CANCELLED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Order Cancelled',
      bodyTemplate: 'Your order {{orderId}} has been cancelled.',
    },
    {
      type: NotificationType.ORDER_CANCELLED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Order {{orderId}} Cancelled',
      bodyTemplate: 'Hello {{name}}, your order {{orderId}} has been cancelled.',
    },
    // PAYMENT_SUCCESS
    {
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Payment Successful',
      bodyTemplate: 'Payment of ₹{{amount}} for order {{orderId}} succeeded.',
    },
    {
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Payment Success Receipt',
      bodyTemplate: 'Hello {{name}}, we have received your payment of ₹{{amount}} for order {{orderId}}. Thank you!',
    },
    // PAYMENT_FAILED
    {
      type: NotificationType.PAYMENT_FAILED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Payment Failed',
      bodyTemplate: 'Payment for order {{orderId}} failed.',
    },
    {
      type: NotificationType.PAYMENT_FAILED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Payment Failed Alert',
      bodyTemplate: 'Hello {{name}}, the payment attempt for order {{orderId}} failed. Please retry your payment from the dashboard.',
    },
    // REFUND_CREATED
    {
      type: NotificationType.REFUND_CREATED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Refund Processed',
      bodyTemplate: 'Refund of ₹{{amount}} for order {{orderId}} has been created.',
    },
    {
      type: NotificationType.REFUND_CREATED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris - Refund Issued',
      bodyTemplate: 'Hello {{name}}, a refund of ₹{{amount}} has been issued for order {{orderId}}. Reason: {{reason}}.',
    },
    // REVIEW_RECEIVED
    {
      type: NotificationType.REVIEW_RECEIVED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'New Review Received',
      bodyTemplate: 'Your product {{productName}} received a {{rating}}★ review.',
    },
    {
      type: NotificationType.REVIEW_RECEIVED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris Seller - New Review Alert',
      bodyTemplate: 'Hello {{sellerName}}, a customer left a {{rating}}★ review on your product "{{productName}}". Title: "{{title}}".',
    },
    // REVIEW_REPORTED
    {
      type: NotificationType.REVIEW_REPORTED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Review Reported',
      bodyTemplate: 'Review ID {{reviewId}} was flagged for moderation.',
    },
    {
      type: NotificationType.REVIEW_REPORTED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris Admin - Review Flagged',
      bodyTemplate: 'Admin alert: Review ID {{reviewId}} on product "{{productName}}" was reported. Reason: "{{reason}}".',
    },
    // PRODUCT_APPROVED
    {
      type: NotificationType.PRODUCT_APPROVED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Product Approved',
      bodyTemplate: 'Your product {{productName}} has been approved.',
    },
    {
      type: NotificationType.PRODUCT_APPROVED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris Seller - Product Approved',
      bodyTemplate: 'Hello {{sellerName}}, your product "{{productName}}" has been approved and is now live in the marketplace.',
    },
    // PRODUCT_REJECTED
    {
      type: NotificationType.PRODUCT_REJECTED,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'Product Rejected',
      bodyTemplate: 'Your product {{productName}} was rejected.',
    },
    {
      type: NotificationType.PRODUCT_REJECTED,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris Seller - Product Rejected',
      bodyTemplate: 'Hello {{sellerName}}, your product "{{productName}}" was rejected. Reason: {{reason}}.',
    },
    // SYSTEM_ALERT
    {
      type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.IN_APP,
      titleTemplate: 'System Alert',
      bodyTemplate: 'Platform Update: {{message}}',
    },
    {
      type: NotificationType.SYSTEM_ALERT,
      channel: NotificationChannel.EMAIL,
      titleTemplate: 'Nexaris Platform Alert',
      bodyTemplate: 'Important updates: {{message}}',
    },
  ];

  await prisma.notificationTemplate.createMany({
    data: templatesData,
  });
  console.log(`Seeded ${templatesData.length} default notification templates.`);

  // --- Seed Analytics Mock Data for past 45 days ---
  console.log('Seeding analytics mock data (views, orders, ratings)...');
  const now = new Date();
  
  // Create a couple more customers for cohort calculations
  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@nexaris.com',
      passwordHash: customerHash,
      role: Role.CUSTOMER,
      profile: {
        create: {
          firstName: 'Jane',
          lastName: 'Smith',
        },
      },
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'customer3@nexaris.com',
      passwordHash: customerHash,
      role: Role.CUSTOMER,
      profile: {
        create: {
          firstName: 'Mike',
          lastName: 'Brown',
        },
      },
    },
  });

  // Seed Seller Ratings for Business Health Score
  await prisma.sellerRating.createMany({
    data: [
      { sellerId: approvedSeller.id, customerId: customer.id, rating: 5, comment: 'Amazing service!' },
      { sellerId: approvedSeller.id, customerId: customer2.id, rating: 4, comment: 'Fast delivery.' },
      { sellerId: approvedSeller.id, customerId: customer3.id, rating: 5, comment: 'High quality items.' },
    ],
  });

  const customersList = [customer, customer2, customer3];
  
  // Daily loop for 45 days
  for (let i = 45; i >= 0; i--) {
    const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    
    // Seed views (20-40 per day)
    const viewCount = Math.floor(Math.random() * 20) + 20;
    const viewsToCreate = [];
    for (let v = 0; v < viewCount; v++) {
      const prod = Math.random() > 0.4 ? product1 : product2;
      viewsToCreate.push({
        productId: prod.id,
        createdAt: targetDate,
      });
    }
    await prisma.productView.createMany({ data: viewsToCreate });

    // Seed orders (1-3 per day)
    const orderCount = Math.floor(Math.random() * 3) + 1;
    for (let o = 0; o < orderCount; o++) {
      // Pick random customer
      const cust = customersList[Math.floor(Math.random() * customersList.length)];
      
      // Pick product & variant
      const isMacbook = Math.random() > 0.5;
      const price = isMacbook ? 249900.00 : 129999.00;
      const name = isMacbook ? 'Macbook Pro 16"' : 'iPhone 15 Pro';
      const prodId = isMacbook ? product2.id : product1.id;
      const slug = isMacbook ? 'macbook-pro-16' : 'iphone-15-pro';
      const image = isMacbook ? 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=600' : 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&q=80&w=600';
      const sku = isMacbook ? 'MACBOOK-M3PRO-512' : 'IPHONE-15-PRO-128GB';

      const isRefunded = i === 15 || i === 28; // mark a couple orders as refunded
      const status = isRefunded ? 'REFUNDED' : 'DELIVERED';

      await prisma.order.create({
        data: {
          customerId: cust.id,
          status: status as any,
          subtotal: price,
          tax: price * 0.08,
          shipping: 15.00,
          total: price * 1.08 + 15.00,
          createdAt: targetDate,
          updatedAt: targetDate,
          items: {
            create: [
              {
                productId: prodId,
                quantity: 1,
                price: price,
                productName: name,
                productSlug: slug,
                productImage: image,
                variantSku: sku,
                sellerId: approvedSeller.id,
                fulfillmentStatus: 'DELIVERED',
              },
            ],
          },
          payment: {
            create: {
              status: isRefunded ? 'REFUNDED' : 'SUCCESS',
              amount: price * 1.08 + 15.00,
              idempotencyKey: `idempotency-${targetDate.getTime()}-${o}`,
              expiresAt: new Date(targetDate.getTime() + 15 * 60 * 1000),
              createdAt: targetDate,
              updatedAt: targetDate,
            },
          },
        },
      });
    }
  }
  console.log('Seeded views and orders analytics history.');

  // --- Seed Promotions & Marketing Mock Data ---
  console.log('Seeding coupons, campaigns, and loyalty data...');
  
  // Seed sample platform coupon
  await prisma.coupon.create({
    data: {
      code: 'WELCOME100',
      discountType: 'FIXED_AMOUNT',
      value: 100.00,
      minOrderValue: 500.00,
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      usageLimit: 1000,
      perUserLimit: 1,
      isActive: true,
    },
  });

  // Seed sample seller-specific coupon
  await prisma.coupon.create({
    data: {
      code: 'BOBSBOOKS',
      discountType: 'PERCENTAGE',
      value: 15.00,
      minOrderValue: 200.00,
      maxDiscountAmount: 50.00,
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 500,
      perUserLimit: 2,
      sellerId: approvedSeller.id,
      isActive: true,
    },
  });

  // Seed free shipping coupon
  await prisma.coupon.create({
    data: {
      code: 'FREESHIP',
      discountType: 'FREE_SHIPPING',
      value: 0.00,
      minOrderValue: 100.00,
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: null,
      perUserLimit: 10,
      isActive: true,
    },
  });

  // Seed sample A/B Testing Campaign
  const parentCampaign = await prisma.campaign.create({
    data: {
      name: 'Summer Gadgets Bash',
      description: 'Find premium gadgets discounted for our summer sale catalog.',
      type: 'FLASH_SALE',
      discountType: 'PERCENTAGE',
      value: 0.00,
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      sellerId: approvedSeller.id,
      abTest: true,
      isActive: true,
      isApproved: true,
    },
  });

  await prisma.campaign.create({
    data: {
      name: 'Summer Gadgets Bash (Variant A)',
      description: 'Find premium gadgets discounted for our summer sale catalog.',
      type: 'FLASH_SALE',
      discountType: 'PERCENTAGE',
      value: 10.00,
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      sellerId: approvedSeller.id,
      abTest: true,
      variant: 'A',
      parentCampaignId: parentCampaign.id,
      clicks: 450,
      conversions: 35,
      revenue: 35000.00,
      isActive: true,
      isApproved: true,
    },
  });

  await prisma.campaign.create({
    data: {
      name: 'Summer Gadgets Bash (Variant B)',
      description: 'Find premium gadgets discounted for our summer sale catalog.',
      type: 'FLASH_SALE',
      discountType: 'PERCENTAGE',
      value: 15.00,
      startDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      sellerId: approvedSeller.id,
      abTest: true,
      variant: 'B',
      parentCampaignId: parentCampaign.id,
      clicks: 480,
      conversions: 42,
      revenue: 41000.00,
      isActive: true,
      isApproved: true,
    },
  });

  // Seed Loyalty profiles for customers
  const namedCustomers = [
    { cust: customer, firstName: 'John' },
    { cust: customer2, firstName: 'Jane' },
    { cust: customer3, firstName: 'Mike' },
  ];

  for (const { cust, firstName } of namedCustomers) {
    const points = cust.id === customer.id ? 1200 : cust.id === customer2.id ? 600 : 2600;
    const tier = points >= 5000 ? 'PLATINUM' : points >= 2500 ? 'GOLD' : points >= 1000 ? 'SILVER' : 'BRONZE';

    await prisma.loyaltyProfile.create({
      data: {
        userId: cust.id,
        points,
        tier: tier as any,
      },
    });

    await prisma.loyaltyHistory.create({
      data: {
        userId: cust.id,
        pointsChange: points,
        reason: 'Seeded initial loyalty balance based on historical orders.',
      },
    });

    // Seed referral codes
    const namePart = firstName.toUpperCase().substring(0, 4);
    await prisma.referralCode.create({
      data: {
        userId: cust.id,
        code: `REF-${namePart}-1234`,
      },
    });
  }

  // Set up referred relationship (customer referred customer2)
  await prisma.referral.create({
    data: {
      referrerId: customer.id,
      refereeId: customer2.id,
      rewardClaimed: true,
    },
  });

  // Seed Search Synonyms
  console.log('Seeding search synonyms...');
  await prisma.searchSynonym.createMany({
    data: [
      { word: 'iphone', synonyms: ['apple phone'] },
      { word: 'apple phone', synonyms: ['iphone'] },
      { word: 'tv', synonyms: ['television'] },
      { word: 'television', synonyms: ['tv'] },
      { word: 'earbuds', synonyms: ['earphones'] },
      { word: 'earphones', synonyms: ['earbuds'] },
      { word: 'mobile', synonyms: ['smartphone'] },
      { word: 'smartphone', synonyms: ['mobile'] },
    ],
  });

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
