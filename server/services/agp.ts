import type { GlucoseReading } from "../../drizzle/schema";

export type AGPReport = {
  period: { from: number; to: number };
  statistics: {
    readings: number;
    meanGlucose: number;
    glucoseManagementIndicator: number;
    timeInRange: number;
    timeAboveRange: number;
    timeBelowRange: number;
    coefficientOfVariation: number;
    targetMin: number;
    targetMax: number;
  };
  dailyProfiles: Array<{
    date: string;
    readings: Array<{ time: string; value: number }>;
    metrics: { min: number; max: number; mean: number; tir: number };
  }>;
};

export function generateAGPReport(
  readings: GlucoseReading[],
  targetMin: number,
  targetMax: number,
  from: number,
  to: number,
): AGPReport {
  const values = readings.map(r => r.value);
  const n = values.length;
  const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;

  const inRange = readings.filter(r => r.value >= targetMin && r.value <= targetMax).length;
  const aboveRange = readings.filter(r => r.value > targetMax).length;
  const belowRange = readings.filter(r => r.value < targetMin).length;

  const variance = n > 1 ? values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const cv = mean > 0 ? (sd / mean) * 100 : 0;

  const gmi = 12.71 + 4.70587 * (mean / 18.015);

  const dailyMap = new Map<string, Array<{ time: string; value: number }>>();
  for (const r of readings) {
    const d = new Date(r.recordedAt);
    const dateKey = d.toISOString().split("T")[0];
    if (!dailyMap.has(dateKey)) dailyMap.set(dateKey, []);
    dailyMap.get(dateKey)!.push({
      time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      value: r.value,
    });
  }

  const dailyProfiles: AGPReport["dailyProfiles"] = [];
  for (const [date, dayReadings] of dailyMap) {
    const dayValues = dayReadings.map(r => r.value);
    dailyProfiles.push({
      date,
      readings: dayReadings,
      metrics: {
        min: Math.min(...dayValues),
        max: Math.max(...dayValues),
        mean: dayValues.reduce((a, b) => a + b, 0) / dayValues.length,
        tir: (dayValues.filter(v => v >= targetMin && v <= targetMax).length / dayValues.length) * 100,
      },
    });
  }
  dailyProfiles.sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: { from, to },
    statistics: {
      readings: n,
      meanGlucose: Math.round(mean * 10) / 10,
      glucoseManagementIndicator: Math.round(gmi * 10) / 10,
      timeInRange: n > 0 ? Math.round((inRange / n) * 100) : 0,
      timeAboveRange: n > 0 ? Math.round((aboveRange / n) * 100) : 0,
      timeBelowRange: n > 0 ? Math.round((belowRange / n) * 100) : 0,
      coefficientOfVariation: Math.round(cv * 10) / 10,
      targetMin,
      targetMax,
    },
    dailyProfiles,
  };
}
