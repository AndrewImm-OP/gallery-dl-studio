import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { SiteAuth, AuthTestResult, SiteAuthInfo } from '../../shared/types';

// List of popular sites that support authentication
const SUPPORTED_SITES: SiteAuthInfo[] = [
  { category: 'instagram', displayName: 'Instagram', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'Browser cookies recommended' },
  { category: 'twitter', displayName: 'Twitter / X', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'Browser cookies recommended' },
  { category: 'pixiv', displayName: 'Pixiv', supportedMethods: ['credentials', 'cookies-browser', 'cookies-file'], notes: 'Username + password or browser cookies' },
  { category: 'deviantart', displayName: 'DeviantArt', supportedMethods: ['credentials', 'cookies-browser', 'cookies-file'] },
  { category: 'danbooru', displayName: 'Danbooru', supportedMethods: ['credentials'], notes: 'Username + API key as password' },
  { category: 'e621', displayName: 'e621', supportedMethods: ['credentials'], notes: 'Username + API key as password' },
  { category: 'patreon', displayName: 'Patreon', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'Browser cookies required' },
  { category: 'fanbox', displayName: 'Pixiv FANBOX', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'fantia', displayName: 'Fantia', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'kemono', displayName: 'Kemono', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'reddit', displayName: 'Reddit', supportedMethods: ['credentials', 'cookies-browser'], notes: 'Client ID required for OAuth' },
  { category: 'tumblr', displayName: 'Tumblr', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'flickr', displayName: 'Flickr', supportedMethods: ['credentials', 'cookies-browser'] },
  { category: 'pinterest', displayName: 'Pinterest', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'facebook', displayName: 'Facebook', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'tiktok', displayName: 'TikTok', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'newgrounds', displayName: 'Newgrounds', supportedMethods: ['credentials', 'cookies-browser'] },
  { category: 'inkbunny', displayName: 'Inkbunny', supportedMethods: ['credentials'] },
  { category: 'furaffinity', displayName: 'Fur Affinity', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'sankaku', displayName: 'Sankaku', supportedMethods: ['credentials', 'cookies-browser'] },
  { category: 'mangadex', displayName: 'MangaDex', supportedMethods: ['credentials'] },
  { category: 'subscribestar', displayName: 'SubscribeStar', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'boosty', displayName: 'Boosty', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'bluesky', displayName: 'Bluesky', supportedMethods: ['credentials'] },
  { category: 'baraag', displayName: 'Baraag', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'Mastodon instance — browser cookies recommended' },
  { category: 'mastodon', displayName: 'Mastodon', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'vk', displayName: 'VK', supportedMethods: ['credentials', 'cookies-browser'] },
  { category: 'weibo', displayName: 'Weibo', supportedMethods: ['cookies-browser', 'cookies-file'] },
  { category: 'hentairox', displayName: 'HentaiRox', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'IMHentai mirror — browser cookies if needed' },
  { category: 'imhentai', displayName: 'IMHentai', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'Browser cookies if needed' },
  { category: 'hentaiera', displayName: 'HentaiEra', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'IMHentai mirror' },
  { category: 'hentaifox', displayName: 'HentaiFox', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'IMHentai mirror' },
  { category: 'hentaienvy', displayName: 'HentaiEnvy', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'IMHentai mirror' },
  { category: 'hentaizap', displayName: 'HentaiZap', supportedMethods: ['cookies-browser', 'cookies-file'], notes: 'IMHentai mirror' },
];

export class AuthService {
  private authFile: string;
  private entries: SiteAuth[] = [];

  constructor() {
    const dataDir = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this.authFile = path.join(dataDir, 'auth.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.authFile)) {
        const raw = fs.readFileSync(this.authFile, 'utf-8');
        const data = JSON.parse(raw);
        this.entries = Array.isArray(data) ? data : [];
        // Decrypt passwords in memory
        for (const entry of this.entries) {
          if (entry.password) {
            entry.password = this.decrypt(entry.password);
          }
        }
      }
    } catch {
      this.entries = [];
    }
  }

  private save(): void {
    // Clone and encrypt passwords before writing
    const toWrite = this.entries.map(e => ({
      ...e,
      password: e.password ? this.encrypt(e.password) : undefined,
    }));
    const tmp = this.authFile + '.tmp.' + crypto.randomBytes(4).toString('hex');
    fs.writeFileSync(tmp, JSON.stringify(toWrite, null, 2), 'utf-8');
    fs.renameSync(tmp, this.authFile);
  }

  private encrypt(text: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(text).toString('base64');
    }
    // Fallback: base64 (not secure, but functional)
    return Buffer.from(text).toString('base64');
  }

  private decrypt(text: string): string {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(text, 'base64'));
      }
      return Buffer.from(text, 'base64').toString('utf-8');
    } catch {
      return text;
    }
  }

  list(): SiteAuth[] {
    // Return entries with password masked for security
    return this.entries.map(e => ({
      ...e,
      password: e.password ? '••••••••' : undefined,
    }));
  }

  get(id: string): SiteAuth | null {
    const entry = this.entries.find(e => e.id === id);
    if (!entry) return null;
    // Return with masked password
    return { ...entry, password: entry.password ? '••••••••' : undefined };
  }

  save_entry(auth: SiteAuth): SiteAuth {
    const now = new Date().toISOString();
    const existing = this.entries.find(e => e.id === auth.id);
    if (existing) {
      // Update — keep old password if new one is masked
      Object.assign(existing, {
        ...auth,
        password: auth.password === '••••••••' ? existing.password : auth.password,
        updatedAt: now,
      });
    } else {
      auth.id = auth.id || crypto.randomUUID();
      auth.createdAt = auth.createdAt || now;
      auth.updatedAt = now;
      auth.testStatus = auth.testStatus || 'untested';
      this.entries.push(auth);
    }
    this.save();
    return { ...auth, password: auth.password && auth.password !== '••••••••' ? '••••••••' : auth.password };
  }

  delete_entry(id: string): void {
    this.entries = this.entries.filter(e => e.id !== id);
    this.save();
  }

  // Get the REAL (unmasked) auth entry for use by gallery-dl
  getForDownload(site: string): SiteAuth | null {
    return this.entries.find(e => e.site === site && e.enabled) ?? null;
  }

  getSupportedSites(): SiteAuthInfo[] {
    return SUPPORTED_SITES;
  }

  listBrowsers(): string[] {
    return ['firefox', 'chrome', 'chromium', 'opera', 'edge', 'brave', 'safari', 'vivaldi'];
  }
}
