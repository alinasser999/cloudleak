import type { NewFindingRow, Resource } from "@cloudleak/core";

export interface Rule {
  check(resource: Resource): NewFindingRow | null;
}
