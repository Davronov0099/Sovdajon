import { prisma } from '../../config/database.js';

// ===== PUBLIC =====

export async function listMarketplaceProducts(opts: {
  search?: string;
  categoryId?: string;
  page: number;
  limit: number;
}) {
  const { search, categoryId, page, limit } = opts;
  const where = {
    isDeleted: false,
    isMarketplaceVisible: true,
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [{ name: { contains: search, mode: 'insensitive' as const } }],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        unit: true,
        images: true,
        showPrice: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
}

export async function getMarketplaceProduct(id: string) {
  return prisma.product.findFirst({
    where: { id, isDeleted: false, isMarketplaceVisible: true },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      unit: true,
      images: true,
      description: true,
      showPrice: true,
      category: { select: { id: true, name: true } },
    },
  });
}

export async function getMarketplaceCategories() {
  const cats = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          products: {
            where: { isDeleted: false, isMarketplaceVisible: true },
          },
        },
      },
    },
    orderBy: { order: 'asc' },
  });
  return cats.filter((c) => c._count.products > 0);
}

export async function getCompanySettings() {
  const keys = ['companyName', 'companyPhone', 'companyAddress', 'companyWorkHours'];
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return map;
}

export async function createMarketplaceOrder(input: {
  customerName: string;
  customerPhone: string;
  address?: string;
  notes?: string;
  items: { productId: string; quantity: number }[];
}) {
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isDeleted: false, isMarketplaceVisible: true },
    select: { id: true, name: true, price: true },
  });

  if (products.length !== productIds.length) {
    throw new Error("Ba'zi mahsulotlar topilmadi yoki ular mavjud emas");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = input.items.map((item) => {
    const product = productMap.get(item.productId)!;
    const priceUzs = Number(product.price);
    return {
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      priceUzs: product.price,
      totalUzs: priceUzs * item.quantity,
    };
  });

  const totalUzs = items.reduce((sum, i) => sum + i.totalUzs, 0);

  const order = await prisma.marketplaceOrder.create({
    data: {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      address: input.address ?? null,
      notes: input.notes ?? null,
      totalUzs,
      items: { create: items },
    },
  });

  return { id: order.id };
}

export async function getMarketplaceOrderStatus(id: number) {
  return prisma.marketplaceOrder.findUnique({
    where: { id },
    include: { items: true },
  });
}

// ===== ADMIN =====

export async function listMarketplaceOrders(status?: string) {
  return prisma.marketplaceOrder.findMany({
    where: status && ['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status)
      ? { status: status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' }
      : {},
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateMarketplaceOrderStatus(
  id: number,
  status: 'CONFIRMED' | 'CANCELLED',
) {
  return prisma.marketplaceOrder.update({
    where: { id },
    data: { status },
  });
}

export async function getBannerLinks(): Promise<Record<string, string>> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'marketplace_banner_links' },
  });
  if (!setting?.value) return {};
  try {
    return JSON.parse(setting.value) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function setBannerLink(bannerName: string, productId: string | null) {
  const existing = await prisma.setting.findUnique({
    where: { key: 'marketplace_banner_links' },
  });
  let links: Record<string, string | null> = {};
  if (existing?.value) {
    try {
      links = JSON.parse(existing.value) as Record<string, string | null>;
    } catch { /* ignore */ }
  }

  if (productId === null) {
    delete links[bannerName];
  } else {
    links[bannerName] = productId;
  }

  await prisma.setting.upsert({
    where: { key: 'marketplace_banner_links' },
    update: { value: JSON.stringify(links) },
    create: { key: 'marketplace_banner_links', value: JSON.stringify(links), type: 'json' },
  });

  return { success: true };
}
