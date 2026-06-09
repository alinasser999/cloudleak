import type { AwsInventoryClient } from "@cloudleak/aws";
import type { NormalizedResource, ResourceType } from "@cloudleak/core";

export interface Collector {
  type: ResourceType;
  collect(client: AwsInventoryClient, region: string): Promise<NormalizedResource[]>;
}
