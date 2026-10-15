import { prisma } from './prisma';

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.drop.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
