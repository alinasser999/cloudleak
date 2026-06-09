import { ScanRepository } from "@cloudleak/db";
import type { Db } from "@cloudleak/db";
import type { Scan, ScanStats, ScanStatus } from "@cloudleak/core";

export class LinkedScanRepo {
  private readonly scanRepo: ScanRepository;

  constructor(
    private readonly db: Db,
    private readonly scanId: string,
  ) {
    this.scanRepo = new ScanRepository(db);
  }

  async create(_organizationId: string, _awsAccountId: string): Promise<Scan> {
    const claimed = await this.scanRepo.claimScan(this.scanId);
    if (!claimed) throw new Error(`Cannot claim scan ${this.scanId} — already claimed or not found`);
    return claimed;
  }

  async update(
    id: string,
    patch: { status: ScanStatus; finishedAt: string; stats: ScanStats },
  ): Promise<Scan> {
    return this.scanRepo.update(id, patch);
  }
}
