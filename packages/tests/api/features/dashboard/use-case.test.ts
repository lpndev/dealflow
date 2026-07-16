import { describe, expect, test } from "vitest";
import { buckets, buildSeries } from "@/features/dashboard/use-case";

const now = new Date("2026-07-10T15:30:00");

describe("buckets", () => {
  test("week has 7 daily buckets ending today", () => {
    const defs = buckets("week", now);
    expect(defs).toHaveLength(7);
    expect(defs.at(-1)?.label).toBe("10/7");
    expect(defs[0].label).toBe("4/7");
  });

  test("day has 24 hourly buckets ending this hour", () => {
    const defs = buckets("day", now);
    expect(defs).toHaveLength(24);
    expect(defs.at(-1)?.label).toBe("15h");
  });

  test("year has 12 monthly buckets ending this month", () => {
    const defs = buckets("year", now);
    expect(defs).toHaveLength(12);
    expect(defs.at(-1)?.label).toBe("jul");
    expect(defs[0].label).toBe("ago");
  });
});

describe("buildSeries", () => {
  test("counts sent and failed into the right bucket, excludes out-of-window", () => {
    const defs = buckets("week", now);
    const today = new Date("2026-07-10T09:00:00").getTime();
    const yesterday = new Date("2026-07-09T20:00:00").getTime();
    const lastMonth = new Date("2026-06-01T09:00:00").getTime();

    const series = buildSeries(
      defs,
      [today, today, yesterday],
      [today, lastMonth],
    );

    const todayBucket = series.at(-1)!;
    expect(todayBucket.bucket).toBe("10/7");
    expect(todayBucket.sent).toBe(2);
    expect(todayBucket.failed).toBe(1);

    const yesterdayBucket = series.at(-2)!;
    expect(yesterdayBucket.sent).toBe(1);

    const totalFailed = series.reduce((n, b) => n + b.failed, 0);
    expect(totalFailed).toBe(1);
  });
});
