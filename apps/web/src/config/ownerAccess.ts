export const OWNER_ACCESS_STORAGE_KEY = 'laptopguard_owner_portal_unlocked';

export const normalizeOwnerKey = (value: string): string =>
  value.trim().replace(/\s+/g, '').toUpperCase();
