import { invokeLLM } from "../_core/llm";
import type { GlucoseReading, MealLog, InsulinLog, MedicationLog } from "../../drizzle/schema";

export type DailyBriefInput = {
  glucose: Pick<GlucoseReading, "value" | "recordedAt" | "context">[];
  meals: Pick<MealLog, "description" | "carbsEstimate" | "recordedAt" | "mealType">[];
  insulin: Pick<InsulinLog, "units" | "insulinType" | "recordedAt">[];
  medications: Pick<MedicationLog, "medicationName" | "dosage" | "recordedAt">[];
  targetMin: number;
  targetMax: number;
};

export type DailyBrief = {
  summary: string;
  timeInRange: number;
  highlights: string[];
  recommendations: string[];
  patterns: string[];
};

function calculateTimeInRange(readings: DailyBriefInput["glucose"], min: number, max: number): number {
  if (readings.length === 0) return 0;
  const inRange = readings.filter(r => r.value >= min && r.value <= max).length;
  return Math.round((inRange / readings.length) * 100);
}

function formatReadingsForLLM(input: DailyBriefInput): string {
  const lines: string[] = [];
  lines.push(`Target range: ${input.targetMin}-${input.targetMax} mg/dL`);
  lines.push("");
  lines.push("Glucose readings (last 24h):");
  for (const g of input.glucose.slice(0, 50)) {
    const time = new Date(g.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    lines.push(`  ${time}: ${g.value} mg/dL ${g.context ? `(${g.context})` : ""}`);
  }
  lines.push("");
  lines.push("Meals:");
  for (const m of input.meals.slice(0, 10)) {
    const time = new Date(m.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    lines.push(`  ${time}: ${m.mealType} - ${m.description ?? "no desc"} ${m.carbsEstimate ? `(${m.carbsEstimate}g carbs)` : ""}`);
  }
  lines.push("");
  lines.push("Insulin doses:");
  for (const ins of input.insulin.slice(0, 10)) {
    const time = new Date(ins.recordedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    lines.push(`  ${time}: ${ins.units}U ${ins.insulinType}`);
  }
  return lines.join("\n");
}

export async function generateDailyBrief(input: DailyBriefInput): Promise<DailyBrief> {
  const tir = calculateTimeInRange(input.glucose, input.targetMin, input.targetMax);

  const prompt = `You are an AI diabetes assistant. Analyze the following 24-hour patient data and provide a brief in Portuguese (Brazilian).

Return a JSON object with:
- "summary": 2-3 sentence overall summary
- "highlights": array of positive findings
- "recommendations": array of actionable suggestions
- "patterns": array of detected patterns or observations

Patient data:
${formatReadingsForLLM(input)}`;

  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a helpful diabetes analysis AI. Always respond in Portuguese (Brazilian). Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1024,
  });

  const text = typeof result.choices[0].message.content === "string"
    ? result.choices[0].message.content
    : JSON.stringify(result.choices[0].message.content);

  try {
    const parsed = JSON.parse(text) as Partial<DailyBrief>;
    return {
      summary: parsed.summary ?? "Resumo não disponível.",
      timeInRange: tir,
      highlights: parsed.highlights ?? [],
      recommendations: parsed.recommendations ?? [],
      patterns: parsed.patterns ?? [],
    };
  } catch {
    return {
      summary: "Não foi possível gerar o resumo automático.",
      timeInRange: tir,
      highlights: [],
      recommendations: [],
      patterns: [],
    };
  }
}

export function detectPatterns(readings: DailyBriefInput["glucose"], min: number, max: number): string[] {
  const patterns: string[] = [];
  if (readings.length < 10) return ["Poucas leituras para detectar padrões."];

  const hourly = new Map<number, number[]>();
  for (const r of readings) {
    const hour = new Date(r.recordedAt).getHours();
    if (!hourly.has(hour)) hourly.set(hour, []);
    hourly.get(hour)!.push(r.value);
  }

  for (const [hour, values] of hourly) {
    if (values.length < 2) continue;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const below = values.filter(v => v < min).length;
    const above = values.filter(v => v > max).length;

    if (below >= values.length * 0.5) {
      patterns.push(`Hipoglicemia frequente às ${hour}h (${below}/${values.length} leituras abaixo de ${min} mg/dL)`);
    }
    if (above >= values.length * 0.5) {
      patterns.push(`Hiperglicemia frequente às ${hour}h (${above}/${values.length} leituras acima de ${max} mg/dL)`);
    }
  }

  if (patterns.length === 0) {
    patterns.push("Nenhum padrão de risco significativo detectado nas últimas 24h.");
  }

  return patterns;
}
