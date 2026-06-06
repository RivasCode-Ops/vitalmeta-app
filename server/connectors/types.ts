import { z } from "zod";

export const ConnectorConfigSchema = z.object({
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  syncIntervalMs: z.number().default(300000),
});

export type ConnectorConfig = z.infer<typeof ConnectorConfigSchema>;

export type GlucoseRecord = {
  id: string;
  value: number;
  trendArrow?: string;
  recordedAt: number;
  source: string;
};

export type TreatmentRecord = {
  id: string;
  type: "insulin" | "carbs" | "exercise" | "note";
  value?: number;
  units?: string;
  recordedAt: number;
  source: string;
};

export type DeviceStatusRecord = {
  id: string;
  battery?: number;
  recordedAt: number;
  source: string;
};

export type SyncResult = {
  glucose: GlucoseRecord[];
  treatments: TreatmentRecord[];
  deviceStatus: DeviceStatusRecord[];
};

export interface IDataConnector {
  readonly name: string;
  readonly config: ConnectorConfig;
  validate(): Promise<boolean>;
  sync(since: number): Promise<SyncResult>;
}
