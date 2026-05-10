import { promises as fs, createReadStream } from 'fs';
import { createHash } from 'crypto';
import { join, extname, basename, relative, dirname } from 'path';
import { randomUUID } from 'crypto';
import { app, nativeImage, BrowserWindow } from 'electron';
import {
  IpcChannel,
  type DedupConfig,
  type DedupFileInfo,
  type DedupGroup,
  type DedupResult,
  type DedupProgress,
} from '../../shared/types';

const IMAGE_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.avif', '.jfif',
]);

const FORMAT_PRIORITY: Record<string, number> = {
  // Lossless / modern lossless-capable first
  'png': 100,
  'webp': 90,
  'avif': 85,
  'bmp': 70,
  // Lossy
  'jpeg': 60,
  'jpg': 60,
  'jfif': 55,
  // Animated/legacy
  'gif': 30,
};

interface DedupManifest {
  id: string;
  scannedDir: string;
  startedAt: string;
  completedAt: string;
  config: DedupConfig;
  result: DedupResult;
}

export class DedupService {
  private reportsDir: string;
  private cancelled = new Set<string>();

  constructor() {
    this.reportsDir = join(app.getPath('userData'), 'dedup-reports');
  }

  private async ensureReportsDir(): Promise<void> {
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  /**
   * Run dedup on a directory. Safe to call concurrently for different dirs;
   * the same dir running twice in parallel is the caller's responsibility.
   */
  async scan(
    scannedDir: string,
    config: DedupConfig,
    taskId?: string,
  ): Promise<DedupResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const errors: string[] = [];

    const result: DedupResult = {
      scannedDir,
      filesScanned: 0,
      imagesAnalyzed: 0,
      groups: [],
      filesMoved: 0,
      spaceSavedBytes: 0,
      durationMs: 0,
      dryRun: config.dryRun,
      errors,
      startedAt,
      completedAt: startedAt,
    };

    // Sanity checks: don't scan the duplicates folder itself, and don't run
    // on missing/unreadable directories.
    try {
      const stat = await fs.stat(scannedDir);
      if (!stat.isDirectory()) {
        errors.push(`Not a directory: ${scannedDir}`);
        result.completedAt = new Date().toISOString();
        return result;
      }
    } catch (err) {
      errors.push(`Cannot stat ${scannedDir}: ${(err as Error).message}`);
      result.completedAt = new Date().toISOString();
      return result;
    }

    this.emitProgress({
      taskId,
      scannedDir,
      phase: 'scanning',
      current: 0,
      total: 0,
      message: 'Listing files...',
    });

    const allowedExts =
      config.extensions.length > 0
        ? new Set(config.extensions.map((e) => (e.startsWith('.') ? e : '.' + e).toLowerCase()))
        : IMAGE_EXTS;

    const dupFolderAbs = join(scannedDir, config.duplicatesFolder);

    // Collect candidate image files, skipping the duplicates folder.
    const files: string[] = [];
    await this.walk(scannedDir, dupFolderAbs, allowedExts, files);
    result.filesScanned = files.length;

    if (files.length === 0) {
      result.completedAt = new Date().toISOString();
      result.durationMs = Date.now() - startMs;
      return result;
    }

    // Hash all files (SHA256 + pHash). Sequential keeps memory bounded.
    const infos: DedupFileInfo[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i]!;
      this.emitProgress({
        taskId,
        scannedDir,
        phase: 'hashing',
        current: i + 1,
        total: files.length,
        message: basename(f),
      });
      try {
        const info = await this.analyzeFile(f);
        if (info) infos.push(info);
      } catch (err) {
        errors.push(`${f}: ${(err as Error).message}`);
      }
    }
    result.imagesAnalyzed = infos.length;

    // Group: first by SHA256 (exact), then by pHash buckets (perceptual).
    this.emitProgress({
      taskId,
      scannedDir,
      phase: 'comparing',
      current: 0,
      total: infos.length,
    });

    const groups = this.groupDuplicates(infos, config);
    result.groups = groups;

    // Move duplicates to duplicates folder (unless dry-run).
    if (!config.dryRun && groups.length > 0) {
      await fs.mkdir(dupFolderAbs, { recursive: true });
      let moved = 0;
      const toMove = groups.flatMap((g) => g.duplicates);
      for (let i = 0; i < toMove.length; i++) {
        const dup = toMove[i]!;
        this.emitProgress({
          taskId,
          scannedDir,
          phase: 'moving',
          current: i + 1,
          total: toMove.length,
          message: basename(dup.path),
        });
        try {
          const rel = relative(scannedDir, dup.path);
          // Preserve relative subdirs inside .duplicates/ to avoid name clashes.
          const dest = join(dupFolderAbs, rel);
          await fs.mkdir(dirname(dest), { recursive: true });
          await this.moveFileSafe(dup.path, dest);
          moved++;
          result.spaceSavedBytes += dup.size;
        } catch (err) {
          errors.push(`Move ${dup.path}: ${(err as Error).message}`);
        }
      }
      result.filesMoved = moved;
    }

    result.completedAt = new Date().toISOString();
    result.durationMs = Date.now() - startMs;

    // Persist report (so user can restore later).
    try {
      await this.saveReport(scannedDir, config, result);
    } catch (err) {
      errors.push(`Save report: ${(err as Error).message}`);
    }

    this.emitProgress({
      taskId,
      scannedDir,
      phase: 'done',
      current: infos.length,
      total: infos.length,
      message: `${result.filesMoved} duplicates handled`,
    });

    this.emitResult(result);
    return result;
  }

  // -------------- file walking --------------

  private async walk(
    dir: string,
    skipDir: string,
    allowedExts: Set<string>,
    out: string[],
  ): Promise<void> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      // Skip the duplicates folder itself and any hidden .duplicates dir.
      if (entry.isDirectory()) {
        if (full === skipDir) continue;
        if (entry.name.toLowerCase() === '.duplicates') continue;
        await this.walk(full, skipDir, allowedExts, out);
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase();
        if (allowedExts.has(ext)) out.push(full);
      }
    }
  }

  // -------------- analysis --------------

  private async analyzeFile(path: string): Promise<DedupFileInfo | null> {
    const stat = await fs.stat(path);
    const sha256 = await this.sha256(path);

    const buf = await fs.readFile(path);
    const img = nativeImage.createFromBuffer(buf);
    if (img.isEmpty()) {
      // Unsupported / corrupt — fall back to a deterministic phash from sha so
      // it can't accidentally match anything else perceptually.
      return {
        path,
        size: stat.size,
        width: 0,
        height: 0,
        format: extname(path).slice(1).toLowerCase() || 'unknown',
        sha256,
        phash: sha256.slice(0, 16), // not a real phash; uniqueness only
        score: 0,
      };
    }
    const size = img.getSize();
    const phash = this.computePHashDct(img);
    const format = extname(path).slice(1).toLowerCase() || 'bin';

    const score = this.computeScore(size.width, size.height, stat.size, format);

    return {
      path,
      size: stat.size,
      width: size.width,
      height: size.height,
      format,
      sha256,
      phash,
      score,
    };
  }

  private computeScore(w: number, h: number, bytes: number, format: string): number {
    // Resolution dominates; file size is a tiebreaker; format priority is the
    // last tiebreaker. Scaled so "resolution beats everything else" by design.
    const resolution = w * h; // up to ~1e8
    const sizeBoost = Math.log2(Math.max(bytes, 1)) * 1000; // ~1k..30k
    const formatBoost = FORMAT_PRIORITY[format] ?? 50;
    return resolution * 1000 + sizeBoost + formatBoost;
  }

  private async sha256(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const h = createHash('sha256');
      const s = createReadStream(path);
      s.on('data', (chunk) => h.update(chunk));
      s.on('end', () => resolve(h.digest('hex')));
      s.on('error', reject);
    });
  }

  // -------------- pHash via 32x32 DCT --------------

  /**
   * Perceptual hash:
   *   1. Resize to 32x32 grayscale
   *   2. 2D DCT-II
   *   3. Take 8x8 top-left low-frequency block (skip DC)
   *   4. Compare each coefficient to median; bit = coef > median
   * Returns 64-bit hash as 16-char hex.
   */
  private computePHashDct(img: Electron.NativeImage): string {
    const N = 32;
    // resize keeps aspect ratio false in Electron API by default; force 32x32.
    const resized = img.resize({ width: N, height: N, quality: 'good' });
    const bmp = resized.toBitmap(); // BGRA, length = N*N*4
    const gray = new Float64Array(N * N);
    for (let i = 0, j = 0; j < bmp.length; j += 4, i++) {
      const b = bmp[j]!;
      const g = bmp[j + 1]!;
      const r = bmp[j + 2]!;
      // Rec. 601 luma
      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // Precompute DCT cosine table for 1D pass.
    const cos: number[] = new Array(N * N);
    for (let k = 0; k < N; k++) {
      for (let n = 0; n < N; n++) {
        cos[k * N + n] = Math.cos((Math.PI * (2 * n + 1) * k) / (2 * N));
      }
    }
    // 1D DCT-II row-wise into `tmp`.
    const tmp = new Float64Array(N * N);
    for (let row = 0; row < N; row++) {
      const base = row * N;
      for (let k = 0; k < N; k++) {
        let sum = 0;
        for (let n = 0; n < N; n++) {
          sum += gray[base + n]! * cos[k * N + n]!;
        }
        tmp[base + k] = sum;
      }
    }
    // 1D DCT-II column-wise.
    const dct = new Float64Array(N * N);
    for (let col = 0; col < N; col++) {
      for (let k = 0; k < N; k++) {
        let sum = 0;
        for (let n = 0; n < N; n++) {
          sum += tmp[n * N + col]! * cos[k * N + n]!;
        }
        dct[k * N + col] = sum;
      }
    }

    // Take 8x8 low-frequency block, skip DC (0,0).
    const M = 8;
    const block: number[] = [];
    for (let y = 0; y < M; y++) {
      for (let x = 0; x < M; x++) {
        if (x === 0 && y === 0) continue;
        block.push(dct[y * N + x]!);
      }
    }
    // Median.
    const sorted = [...block].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;

    // Build 64-bit hash. We have 63 coefficients (skipped DC); pad bit 0 with
    // sign of DC vs mean for stability.
    let bits = '';
    bits += dct[0]! > 0 ? '1' : '0';
    for (const v of block) bits += v > median ? '1' : '0';

    // bits.length === 64
    let hex = '';
    for (let i = 0; i < 64; i += 4) {
      const nibble = parseInt(bits.slice(i, i + 4), 2);
      hex += nibble.toString(16);
    }
    return hex;
  }

  private hammingHex(a: string, b: string): number {
    if (a.length !== b.length) return Math.max(a.length, b.length) * 4;
    let dist = 0;
    for (let i = 0; i < a.length; i++) {
      const x = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
      // popcount of a 4-bit nibble
      dist += ((x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1));
    }
    return dist;
  }

  // -------------- grouping --------------

  private groupDuplicates(infos: DedupFileInfo[], config: DedupConfig): DedupGroup[] {
    const groups: DedupGroup[] = [];
    const consumed = new Set<string>();

    // 1. Exact (SHA256) groups — always safe.
    const bySha = new Map<string, DedupFileInfo[]>();
    for (const info of infos) {
      const list = bySha.get(info.sha256) ?? [];
      list.push(info);
      bySha.set(info.sha256, list);
    }
    for (const list of bySha.values()) {
      if (list.length < 2) continue;
      list.sort((a, b) => b.score - a.score);
      const keeper = list[0]!;
      const dups = list.slice(1);
      for (const d of dups) consumed.add(d.path);
      consumed.add(keeper.path);
      groups.push({ keeper, duplicates: dups, reason: 'exact' });
    }

    // 2. Perceptual groups — only if user opted in (threshold > 0).
    if (config.phashThreshold > 0) {
      const remaining = infos.filter((i) => !consumed.has(i.path) && i.width > 0 && i.height > 0);
      // Greedy clustering: for each unvisited file, gather all neighbours
      // within the threshold, but apply safety guards.
      const visited = new Set<string>();
      for (const a of remaining) {
        if (visited.has(a.path)) continue;
        const cluster: DedupFileInfo[] = [a];
        visited.add(a.path);
        for (const b of remaining) {
          if (visited.has(b.path)) continue;
          if (this.areLikelyDuplicates(a, b, config)) {
            cluster.push(b);
            visited.add(b.path);
          }
        }
        if (cluster.length < 2) continue;
        cluster.sort((x, y) => y.score - x.score);
        const keeper = cluster[0]!;
        const dups = cluster.slice(1);
        groups.push({ keeper, duplicates: dups, reason: 'perceptual' });
      }
    }

    return groups;
  }

  private areLikelyDuplicates(
    a: DedupFileInfo,
    b: DedupFileInfo,
    config: DedupConfig,
  ): boolean {
    if (a.path === b.path) return false;
    if (a.width === 0 || b.width === 0) return false;

    const dist = this.hammingHex(a.phash, b.phash);
    if (dist > config.phashThreshold) return false;

    // Safety guard: aspect ratios must be similar. Art variations of the
    // same piece keep aspect ratio; cropped/different works don't.
    const ar1 = a.width / a.height;
    const ar2 = b.width / b.height;
    const arRatio = Math.max(ar1, ar2) / Math.min(ar1, ar2);
    if (arRatio > 1.1) return false;

    // Resolution ratio guard (configurable, prevents thumbnail/full mixing
    // from spilling over in case the user wanted only same-size dedup).
    if (config.maxResolutionRatio > 0) {
      const r1 = a.width * a.height;
      const r2 = b.width * b.height;
      const rRatio = Math.max(r1, r2) / Math.max(1, Math.min(r1, r2));
      // If dimensions differ but pHash matches, that's actually the *desired*
      // case (low-res vs hi-res of the same image) — so we ALLOW big ratios
      // here, but we use this knob to optionally cap. Default 0 = unlimited.
      if (rRatio > config.maxResolutionRatio) return false;
    }
    return true;
  }

  // -------------- moving --------------

  private async moveFileSafe(src: string, dest: string): Promise<void> {
    try {
      await fs.rename(src, dest);
    } catch (err) {
      // EXDEV (cross-device) → fallback copy + unlink.
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EXDEV') {
        await fs.copyFile(src, dest);
        await fs.unlink(src);
        return;
      }
      // EEXIST → append a counter.
      if (code === 'EEXIST') {
        let i = 1;
        const ext = extname(dest);
        const base = dest.slice(0, dest.length - ext.length);
        while (true) {
          const candidate = `${base} (${i})${ext}`;
          try {
            await fs.access(candidate);
            i++;
          } catch {
            await fs.rename(src, candidate);
            return;
          }
        }
      }
      throw err;
    }
  }

  // -------------- reports --------------

  private async saveReport(
    scannedDir: string,
    config: DedupConfig,
    result: DedupResult,
  ): Promise<void> {
    await this.ensureReportsDir();
    const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const manifest: DedupManifest = {
      id,
      scannedDir,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      config,
      result,
    };
    const reportPath = join(this.reportsDir, `${id}.json`);
    await fs.writeFile(reportPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // Also drop a manifest in the dedup folder itself for offline inspection.
    if (!config.dryRun && result.filesMoved > 0) {
      const localPath = join(scannedDir, config.duplicatesFolder, 'manifest.json');
      try {
        await fs.writeFile(localPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {
        /* best-effort */
      }
    }
  }

  async listReports(): Promise<
    Array<{ id: string; scannedDir: string; completedAt: string; filesMoved: number }>
  > {
    await this.ensureReportsDir();
    const files = await fs.readdir(this.reportsDir);
    const reports: Array<{ id: string; scannedDir: string; completedAt: string; filesMoved: number }> = [];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const data = JSON.parse(await fs.readFile(join(this.reportsDir, f), 'utf-8')) as DedupManifest;
        reports.push({
          id: data.id,
          scannedDir: data.scannedDir,
          completedAt: data.completedAt,
          filesMoved: data.result.filesMoved,
        });
      } catch {
        /* skip corrupt */
      }
    }
    reports.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    return reports;
  }

  async getReport(id: string): Promise<DedupResult | null> {
    try {
      const data = JSON.parse(
        await fs.readFile(join(this.reportsDir, `${id}.json`), 'utf-8'),
      ) as DedupManifest;
      return data.result;
    } catch {
      return null;
    }
  }

  /**
   * Restore a single duplicate from the duplicates folder back to its
   * original location. Returns true if successful.
   */
  async restore(reportId: string, originalPath: string): Promise<boolean> {
    const report = await this.loadManifest(reportId);
    if (!report) return false;
    // Find the file in any group's duplicates list to learn its mapped name.
    let found: { dup: DedupFileInfo; manifest: DedupManifest } | null = null;
    for (const g of report.result.groups) {
      const m = g.duplicates.find((d) => d.path === originalPath);
      if (m) {
        found = { dup: m, manifest: report };
        break;
      }
    }
    if (!found) return false;
    const dupRoot = join(report.scannedDir, report.config.duplicatesFolder);
    const rel = relative(report.scannedDir, originalPath);
    const movedPath = join(dupRoot, rel);
    try {
      await fs.mkdir(dirname(originalPath), { recursive: true });
      await this.moveFileSafe(movedPath, originalPath);
      return true;
    } catch {
      return false;
    }
  }

  private async loadManifest(id: string): Promise<DedupManifest | null> {
    try {
      return JSON.parse(
        await fs.readFile(join(this.reportsDir, `${id}.json`), 'utf-8'),
      ) as DedupManifest;
    } catch {
      return null;
    }
  }

  // -------------- IPC plumbing --------------

  private emitProgress(p: DedupProgress): void {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send(IpcChannel.DEDUP_PROGRESS, p);
    }
  }

  private emitResult(r: DedupResult): void {
    for (const w of BrowserWindow.getAllWindows()) {
      w.webContents.send(IpcChannel.DEDUP_RESULT, r);
    }
  }
}

