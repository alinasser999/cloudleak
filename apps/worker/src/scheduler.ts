import { createServiceClient, ScheduleRepository, ScanRepository } from "@cloudleak/db";

export async function pollSchedules(): Promise<void> {
  const db = createServiceClient();
  const scheduleRepo = new ScheduleRepository(db);
  const scanRepo = new ScanRepository(db);

  const due = await scheduleRepo.listDue();
  if (due.length === 0) return;

  console.log(`[scheduler] ${due.length} schedule(s) due`);

  for (const schedule of due) {
    try {
      await scanRepo.createQueued(schedule.organizationId, schedule.awsAccountId);
      await scheduleRepo.markDispatched(schedule.id, schedule.frequency);
      console.log(
        `[scheduler] queued scan for account ${schedule.awsAccountId} (${schedule.frequency})`,
      );
    } catch (e) {
      console.error(`[scheduler] failed to dispatch schedule ${schedule.id}:`, e);
    }
  }
}
