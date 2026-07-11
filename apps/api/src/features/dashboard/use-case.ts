import type {
  DashboardBucket,
  DashboardData,
  DashboardRange,
} from "@dealflow/shared";
import { and, eq, gte, inArray } from "drizzle-orm";
import { listDestinations } from "@/features/destinations/use-case";
import type { Db } from "@/shared/db";
import { delivery } from "@/shared/schema";

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

type BucketDef = { start: number; end: number; label: string };

function shift(d: Date, mutate: (x: Date) => void): Date {
  const x = new Date(d);
  mutate(x);
  return x;
}

export function buckets(range: DashboardRange, now: Date): BucketDef[] {
  const defs: BucketDef[] = [];
  if (range === "day") {
    const anchor = shift(now, (x) => x.setMinutes(0, 0, 0));
    for (let i = 23; i >= 0; i--) {
      const start = shift(anchor, (x) => x.setHours(x.getHours() - i));
      const end = shift(start, (x) => x.setHours(x.getHours() + 1));
      defs.push({
        start: start.getTime(),
        end: end.getTime(),
        label: `${start.getHours()}h`,
      });
    }
  } else if (range === "week" || range === "month") {
    const days = range === "week" ? 7 : 30;
    const anchor = shift(now, (x) => x.setHours(0, 0, 0, 0));
    for (let i = days - 1; i >= 0; i--) {
      const start = shift(anchor, (x) => x.setDate(x.getDate() - i));
      const end = shift(start, (x) => x.setDate(x.getDate() + 1));
      defs.push({
        start: start.getTime(),
        end: end.getTime(),
        label: `${start.getDate()}/${start.getMonth() + 1}`,
      });
    }
  } else {
    const anchor = shift(now, (x) => {
      x.setDate(1);
      x.setHours(0, 0, 0, 0);
    });
    for (let i = 11; i >= 0; i--) {
      const start = shift(anchor, (x) => x.setMonth(x.getMonth() - i));
      const end = shift(start, (x) => x.setMonth(x.getMonth() + 1));
      defs.push({
        start: start.getTime(),
        end: end.getTime(),
        label: MONTHS[start.getMonth()],
      });
    }
  }
  return defs;
}

// ponytail: O(events × buckets) scan; events are one operator's deliveries, buckets ≤ 30 — swap for a bucketed reduce if volume ever matters.
export function buildSeries(
  defs: BucketDef[],
  sentTs: number[],
  failedTs: number[],
): DashboardBucket[] {
  return defs.map((b) => ({
    bucket: b.label,
    sent: sentTs.filter((t) => t >= b.start && t < b.end).length,
    failed: failedTs.filter((t) => t >= b.start && t < b.end).length,
  }));
}

export function getDashboard(
  db: Db,
  range: DashboardRange,
  now = new Date(),
): DashboardData {
  const defs = buckets(range, now);
  const windowStart = new Date(defs[0].start);

  const pending = db
    .select({ id: delivery.id })
    .from(delivery)
    .where(inArray(delivery.status, ["scheduled", "processing"]))
    .all().length;

  const groups = listDestinations(db).filter((d) => d.enabled).length;

  const sentTs = db
    .select({ at: delivery.sentAt })
    .from(delivery)
    .where(and(eq(delivery.status, "sent"), gte(delivery.sentAt, windowStart)))
    .all()
    .map((r) => r.at!.getTime());

  const failedTs = db
    .select({ at: delivery.createdAt })
    .from(delivery)
    .where(
      and(eq(delivery.status, "failed"), gte(delivery.createdAt, windowStart)),
    )
    .all()
    .map((r) => r.at.getTime());

  const series = buildSeries(defs, sentTs, failedTs);

  return {
    range,
    sent: sentTs.length,
    pending,
    groups,
    failed: failedTs.length,
    series,
  };
}
