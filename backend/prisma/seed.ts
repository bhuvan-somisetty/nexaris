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

  // --- Programmatic generation of 2000 products spanning 1 INR to 5 Lakhs ---
  console.log('Generating 2000 products spanning 1 INR to 5 Lakhs...');

  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const TIER_1_TEMPLATES = [
    { name: 'Safety Pin Pack', basePrice: 5, desc: 'Assorted steel safety pins.', img: 'https://images.unsplash.com/photo-1565193998996-26651a7be241?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Miniature Wooden Bookmark', basePrice: 20, desc: 'Handcrafted birch bookmark with laser-etched patterns.', img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600', category: 'books' },
    { name: 'Anti-Slip Cable Clip', basePrice: 45, desc: 'Double-sided adhesive silicone wire routing guide.', img: 'https://images.unsplash.com/photo-1558089687-f282ffcbd1d5?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Stylus Touch Pen Tips', basePrice: 90, desc: 'Pack of 3 replacement rubber tips for universal capacitive pens.', img: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Clear TPU Phone Screen Guard', basePrice: 79, desc: 'Oleophobic screen protector for daily scratches.', img: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Gel Pen Blue Refills', basePrice: 15, desc: 'Smooth flow 0.5mm replacement ink cartridge.', img: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&q=80&w=600', category: 'books' },
    { name: 'Keyring Loop Connector', basePrice: 8, desc: 'Split ring connector made of high-tensile steel.', img: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Microfiber Cleaning Cloth', basePrice: 35, desc: 'Super soft lint-free cloth for cleaning lenses and screens.', img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Plastic Ruler 15cm', basePrice: 12, desc: 'Transparent acrylic measuring scale.', img: 'https://images.unsplash.com/photo-1501162030997-ab991e60f748?auto=format&fit=crop&q=80&w=600', category: 'books' },
    { name: 'Self-Adhesive Sticky Notes', basePrice: 55, desc: 'Pack of 100 yellow memo sheets.', img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=600', category: 'books' },
  ];

  const TIER_2_TEMPLATES = [
    { name: 'Cotton Crew Neck T-Shirt', basePrice: 499, desc: 'Breathable, premium organic cotton daily t-shirt.', img: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600', category: 'mensApparel' },
    { name: 'Minimalist Leather Wallet', basePrice: 799, desc: 'RFID-blocking slim card holder.', img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Hardcover Notebook', basePrice: 350, desc: 'Dotted grid paper with bookmark and ribbon.', img: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&q=80&w=600', category: 'books' },
    { name: 'Premium Ceramic Mug', basePrice: 299, desc: 'Microwave and dishwasher safe coffee mug.', img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Braided USB-C Cable 2m', basePrice: 450, desc: 'High-speed data transfer and 60W power delivery cable.', img: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Stainless Steel Water Bottle', basePrice: 899, desc: 'Vacuum insulated flask for cold/hot beverages.', img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Classic Wired Mouse', basePrice: 399, desc: 'Ergonomic optical mouse with USB connector.', img: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Aroma Diffuser Oil Pack', basePrice: 599, desc: 'Set of 6 essential oils for humidifiers.', img: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Wired Sports Earphones', basePrice: 699, desc: 'Deep bass in-ear buds with inline microphone.', img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Desktop Organizer Tray', basePrice: 499, desc: 'Divided plastic caddy for stationery items.', img: 'https://images.unsplash.com/photo-1596726588265-f938b81561f5?auto=format&fit=crop&q=80&w=600', category: 'books' },
  ];

  const TIER_3_TEMPLATES = [
    { name: 'Active Noise Earbuds', basePrice: 3499, desc: 'TWS earbuds with ANC and transparency mode.', img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Smart Fitness Tracker', basePrice: 2499, desc: 'Heart rate, SpO2, and sleep tracking band.', img: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Ergonomic Mechanical Keyboard', basePrice: 5999, desc: 'Hot-swappable tactile switches with RGB lighting.', img: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Anti-Theft Commuter Backpack', basePrice: 1999, desc: 'Water-resistant laptop bag with USB charging port.', img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'High-Speed Air Fryer', basePrice: 4999, desc: 'Rapid hot-air circulation cooker for low fat meals.', img: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Premium Leather Shoes', basePrice: 4500, desc: 'Italian leather formal oxford dress shoes.', img: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&q=80&w=600', category: 'mensApparel' },
    { name: 'Classic Denim Denim Jacket', basePrice: 2499, desc: 'Heavyweight rugged cotton trucker jacket.', img: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&q=80&w=600', category: 'mensApparel' },
    { name: 'Wireless Charging Stand 3-in-1', basePrice: 1899, desc: 'Fast charge station for phone, watch, and pods.', img: 'https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
    { name: 'Dimmable LED Desk Lamp', basePrice: 1299, desc: 'Eye-caring touch table lamp with multiple color modes.', img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Cast Iron Skillet Pan', basePrice: 1499, desc: 'Pre-seasoned heavy duty pan for searing and baking.', img: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
  ];

  const TIER_4_TEMPLATES = [
    { name: 'Smart UHD LED TV 43"', basePrice: 28999, desc: '4K resolution smart television with Dolby Atmos.', img: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Pro Mirrorless Camera', basePrice: 65999, desc: '24MP APS-C digital camera with kit lens.', img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Core i5 Gaming Laptop', basePrice: 54999, desc: 'Full HD high-refresh rate screen laptop with RTX graphics.', img: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Double Door Refrigerator', basePrice: 24999, desc: 'Frost-free refrigerator with inverter compressor.', img: 'https://images.unsplash.com/photo-1571175432247-52319df65045?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Split Air Conditioner 1.5T', basePrice: 34999, desc: '5-star energy efficient smart cooling AC.', img: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Front Load Washing Machine', basePrice: 27999, desc: 'Fully automatic washer with steam cleaning technology.', img: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: '24K Yellow Gold Coin 10g', basePrice: 74999, desc: '999.9 pure gold certified investment asset.', img: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Automatic Mechanical Watch', basePrice: 18999, desc: 'Sapphire crystal watch with stainless steel bracelet.', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Premium Wooden Dining Set', basePrice: 42000, desc: '6-seater solid teakwood table and chairs.', img: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'iPad Air 256GB', basePrice: 59999, desc: 'Retina display thin tablet with Apple M2 chip.', img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=600', category: 'smartphones' },
  ];

  const TIER_5_TEMPLATES = [
    { name: 'Luxury Sapphire Wristwatch', basePrice: 380000, desc: 'Handcrafted luxury wristwatch with transparent skeleton tourbillon motion.', img: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Premium Electric Scooter Pro', basePrice: 145000, desc: 'High-torque long range battery electric vehicle with smart navigation.', img: 'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Apple Pro Display XDR 32"', basePrice: 449999, desc: 'Retina 6K resolution professional dynamic range monitor.', img: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Enterprise Rack Server 2U', basePrice: 489999, desc: 'Dual-processor scalable network computing workstation for high loads.', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Custom Diamond Engagement Ring', basePrice: 285000, desc: '1.5 Carat solitaire diamond set in an elegant 18K white gold band.', img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'AI Workstation Tower Dual GPU', basePrice: 399999, desc: 'Supercharged computing tower with liquid cooling and dual workstation GPUs.', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&q=80&w=600', category: 'laptops' },
    { name: 'Luxury Leather Lounge Sofa', basePrice: 180000, desc: 'Top-grain luxury Italian leather sectional recliner sofa.', img: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'High-End Coffee Espresso Machine', basePrice: 120000, desc: 'Commercial grade dual-boiler coffee brewing system.', img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Home Theater Laser Projector', basePrice: 299999, desc: 'Ultra short throw 4K laser projector with HDR10 support.', img: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
    { name: 'Pure Platinum Necklace 50g', basePrice: 220000, desc: 'Exquisite handcrafted heavy solid platinum chain for investment or wear.', img: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600', category: 'fashion' },
  ];

  const categoryMap: Record<string, string> = {
    smartphones: smartphones.id,
    laptops: laptops.id,
    mensApparel: mensApparel.id,
    books: books.id,
    fashion: fashion.id,
  };

  const productDataList: any[] = [];

  for (let i = 1; i <= 2000; i++) {
    let template;
    let tier = 1;
    if (i <= 300) {
      template = TIER_1_TEMPLATES[(i - 1) % TIER_1_TEMPLATES.length];
      tier = 1;
    } else if (i <= 800) {
      template = TIER_2_TEMPLATES[(i - 1) % TIER_2_TEMPLATES.length];
      tier = 2;
    } else if (i <= 1300) {
      template = TIER_3_TEMPLATES[(i - 1) % TIER_3_TEMPLATES.length];
      tier = 3;
    } else if (i <= 1800) {
      template = TIER_4_TEMPLATES[(i - 1) % TIER_4_TEMPLATES.length];
      tier = 4;
    } else {
      template = TIER_5_TEMPLATES[(i - 1) % TIER_5_TEMPLATES.length];
      tier = 5;
    }

    const brandName = ['TATA', 'Reliance', 'Wipro', 'Aditya', 'Mahindra', 'Aura', 'Elevate', 'Vedic', 'Deco', 'Craft'][i % 10];
    const name = `${template.name} - ${brandName} ${['Edition', 'Series', 'V3', 'Classic', 'Pro', 'Max', 'Plus', 'Premium', 'Special'][i % 9]} (v${i})`;
    const slug = `${slugify(template.name)}-v${i}`;
    // `price` is the discounted selling price; `originalPrice` is the MRP shown struck-through.
    const price = template.basePrice + (i % 23);
    const markup = 1.12 + ((i % 9) * 0.05); // ~11% to ~34% discount
    const originalPrice = Math.max(price + 1, Math.round(price * markup));
    const sku = `SKU-${template.name.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${i}`;
    const catId = categoryMap[template.category] || books.id;

    productDataList.push({
      sellerId: approvedSeller.id,
      categoryId: catId,
      name,
      slug,
      description: `${template.desc} Fully vetted and backed by Nexaris Buyer Protection Guarantee. Built for high performance, reliability and everyday usability.`,
      price,
      originalPrice,
      sku,
      status: ProductStatus.PUBLISHED,
      images: {
        create: [
          {
            url: template.img,
            altText: name,
            isMain: true,
          },
        ],
      },
      attributes: {
        create: [
          { name: 'Brand', value: brandName },
          { name: 'Tier', value: `Tier ${tier}` },
          { name: 'Condition', value: 'New' },
        ],
      },
      inventory: {
        create: {
          quantity: 20 + (i % 80),
          lowStockThreshold: 5,
        },
      },
    });
  }

  // Insert in batches of 100 to avoid stack limits or connection delays
  console.log('Inserting 2000 products in batches...');
  for (let idx = 0; idx < productDataList.length; idx += 100) {
    const batch = productDataList.slice(idx, idx + 100);
    await Promise.all(
      batch.map((p) => prisma.product.create({ data: p }))
    );
    console.log(` -> Inserted products ${idx + 1} to ${Math.min(idx + 100, productDataList.length)}`);
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
