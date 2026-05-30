import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EXTRACT_SCHEMA = {
  name: "extract_expense",
  description: "Extract structured fields from a Cuban receipt or expense invoice image.",
  parameters: {
    type: "object",
    properties: {
      vendor: { type: "string", description: "Vendor / supplier name" },
      tax_id: { type: "string", description: "Vendor tax ID (NIT). Empty if absent." },
      date: { type: "string", description: "Date in YYYY-MM-DD format. Empty if absent." },
      amount: { type: "number", description: "Total amount as a number." },
      currency: { type: "string", enum: ["CUP", "USD", "MLC", "EUR"] },
      category: {
        type: "string",
        enum: ["fuel", "maintenance", "tolls", "salaries", "parts", "permits", "food", "lodging", "other"],
      },
      description: { type: "string", description: "Short summary of what was bought." },
    },
    required: ["vendor", "amount", "currency", "category", "description"],
    additionalProperties: false,
  },
};

export type OcrExpense = {
  vendor: string;
  tax_id?: string;
  date?: string;
  amount: number;
  currency: "CUP" | "USD" | "MLC" | "EUR";
  category: "fuel" | "maintenance" | "tolls" | "salaries" | "parts" | "permits" | "food" | "lodging" | "other";
  description: string;
};

export const extractExpenseFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      image_base64: z.string().min(50).max(8_000_000),
      mime_type: z.string().default("image/jpeg"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Lovable AI no configurado");

    const dataUrl = `data:${data.mime_type};base64,${data.image_base64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You read Cuban expense receipts (printed, handwritten, or informal). " +
              "Extract structured data accurately. Always return amounts as numbers without currency symbols. " +
              "Map currency to CUP by default if not stated. Map expense type to the closest category.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae los datos de este recibo y devuélvelos vía la función." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{ type: "function", function: EXTRACT_SCHEMA }],
        tool_choice: { type: "function", function: { name: "extract_expense" } },
      }),
    });

    if (res.status === 429) throw new Error("Límite de uso alcanzado. Intenta más tarde.");
    if (res.status === 402) throw new Error("Saldo de IA insuficiente. Recarga créditos.");
    if (!res.ok) throw new Error(`Error IA: ${res.status}`);

    const payload = await res.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("La IA no devolvió datos estructurados");
    }
    const parsed = JSON.parse(toolCall.function.arguments) as OcrExpense;
    return parsed;
  });
