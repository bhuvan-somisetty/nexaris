import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const products = await p.product.count();
  const cats = await p.category.count();
  const brands = await p.productAttribute.findMany({ where: { name: 'Brand' }, distinct: ['value'], select: { value: true } });
  const reviews = await p.review.count();
  const dupSku = (await p.$queryRawUnsafe(`SELECT sku, COUNT(*) c FROM "Product" WHERE sku IS NOT NULL GROUP BY sku HAVING COUNT(*)>1`)) as any[];
  const dupName = (await p.$queryRawUnsafe(`SELECT name, COUNT(*) c FROM "Product" GROUP BY name HAVING COUNT(*)>1`)) as any[];
  const dupSlug = (await p.$queryRawUnsafe(`SELECT slug, COUNT(*) c FROM "Product" GROUP BY slug HAVING COUNT(*)>1`)) as any[];
  const imgs = (await p.$queryRawUnsafe(`SELECT COUNT(DISTINCT url)::int d, COUNT(*)::int t FROM "ProductImage"`)) as any[];
  const agg = await p.product.aggregate({ _min: { price: true }, _max: { price: true } });

  console.log('==== NEXARIS CATALOG REPORT ====');
  console.log('Total products :', products);
  console.log('Categories     :', cats);
  console.log('Distinct brands:', brands.length);
  console.log('Reviews        :', reviews);
  console.log('Price range    : Rs', agg._min.price?.toString(), '-> Rs', agg._max.price?.toString());
  console.log('Duplicate SKUs :', dupSku.length);
  console.log('Duplicate names:', dupName.length);
  console.log('Duplicate slugs:', dupSlug.length);
  console.log('Image URLs     :', imgs[0].d, 'distinct /', imgs[0].t, 'total');
  await p.$disconnect();
}
main().catch((e) => { console.error('ERR', e); process.exit(1); });
