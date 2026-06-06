import { z } from "zod";
import type { IDataConnector, ConnectorConfig, SyncResult } from "./types";
import { ConnectorConfigSchema } from "./types";

const NightscoutEntrySchema = z.object({
  _id: z.string(),
  sgv: z.number(),
  direction: z.string().optional(),
  date: z.number(),
  type: z.string().optional(),
});

const NightscoutTreatmentSchema = z.object({
  _id: z.string(),
  eventType: z.string(),
  insulin: z.number().optional(),
  carbs: z.number().optional(),
  glucose: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

function trendArrowFromDirection(direction?: string): string {
  if (!direction) return "stable";
  const map: Record<string, string> = {
    "DoubleUp": "rising_fast",
    "SingleUp": "rising",
    "FortyFiveUp": "rising",
    "Flat": "stable",
    "FortyFiveDown": "falling",
    "SingleDown": "falling",
    "DoubleDown": "falling_fast",
    "NOT_COMPUTABLE": "stable",
    "RATE_OUT_OF_RANGE": "stable",
  };
  return map[direction] ?? "stable";
}

export class NightscoutConnector implements IDataConnector {
  readonly name = "nightscout";

  constructor(public readonly config: ConnectorConfig) {
    ConnectorConfigSchema.parse(config);
  }

  async validate(): Promise<boolean> {
    if (!this.config.baseUrl) return false;
    try {
      const res = await fetch(`${this.config.baseUrl}/api/v1/entries.json?count=1`, {
        headers: this.config.apiKey ? { "api-secret": this.config.apiKey } : {},
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async sync(since: number): Promise<SyncResult> {
    const baseUrl = this.config.baseUrl!;
    const headers: Record<string, string> = {};
    if (this.config.apiKey) headers["api-secret"] = this.config.apiKey;

    const [entriesRes, treatmentsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/entries.json?find[date][$gte]=${since}&count=100`, { headers }),
      fetch(`${baseUrl}/api/v1/treatments.json?find[created_at][$gte]=${new Date(since).toISOString()}&count=100`, { headers }),
    ]);

    const glucose: SyncResult["glucose"] = [];
    const treatments: SyncResult["treatments"] = [];

    if (entriesRes.ok) {
      const rawEntries = NightscoutEntrySchema.array().parse(await entriesRes.json());
      for (const e of rawEntries) {
        glucose.push({
          id: e._id,
          value: e.sgv,
          trendArrow: trendArrowFromDirection(e.direction),
          recordedAt: e.date,
          source: "nightscout",
        });
      }
    }

    if (treatmentsRes.ok) {
      const rawTreatments = NightscoutTreatmentSchema.array().parse(await treatmentsRes.json());
      for (const t of rawTreatments) {
        if (t.insulin && t.insulin > 0) {
          treatments.push({
            id: t._id,
            type: "insulin",
            value: t.insulin,
            units: "U",
            recordedAt: new Date(t.createdAt).getTime(),
            source: "nightscout",
          });
        }
        if (t.carbs && t.carbs > 0) {
          treatments.push({
            id: `${t._id}_carbs`,
            type: "carbs",
            value: t.carbs,
            units: "g",
            recordedAt: new Date(t.createdAt).getTime(),
            source: "nightscout",
          });
        }
      }
    }

    return { glucose, treatments, deviceStatus: [] };
  }
}
