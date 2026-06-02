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
      const price = isMacbook ? 2499.00 : 999.99;
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
