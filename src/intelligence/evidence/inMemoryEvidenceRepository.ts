import type { EvidenceRef } from '../../contracts/common';
import type { EvidenceRepository } from '../interfaces';

export class InMemoryEvidenceRepository implements EvidenceRepository {
  private readonly records = new Map<string, EvidenceRef>();

  async saveEvidence(records: EvidenceRef[]): Promise<void> {
    for (const record of records) {
      this.records.set(record.id, { ...record });
    }
  }

  async getEvidence(ids: string[]): Promise<EvidenceRef[]> {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is EvidenceRef => Boolean(record))
      .map((record) => ({ ...record }));
  }
}
