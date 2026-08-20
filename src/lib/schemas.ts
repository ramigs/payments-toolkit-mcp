import { z } from "zod";

export const cardNumberSchema = z
  .string()
  .regex(/^\d{8,19}$/, "Card number must be 8-19 digits, no separators");
