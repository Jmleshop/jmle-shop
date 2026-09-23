import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Ungültige E-Mail-Adresse")
  .max(254, "E-Mail zu lang");

/** Mind. 8 Zeichen, Buchstabe + Ziffer (DE-E-Commerce / OWASP-Basis) */
const passwordSchema = z
  .string()
  .min(8, "Passwort mindestens 8 Zeichen")
  .max(128, "Passwort zu lang")
  .regex(/[A-Za-zÄÖÜäöüß]/, "Passwort braucht mindestens einen Buchstaben")
  .regex(/[0-9]/, "Passwort braucht mindestens eine Ziffer");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Passwort erforderlich").max(128),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Vorname erforderlich")
    .max(80, "Vorname zu lang"),
  lastName: z
    .string()
    .trim()
    .min(1, "Nachname erforderlich")
    .max(80, "Nachname zu lang"),
  street: z
    .string()
    .trim()
    .min(1, "Straße erforderlich")
    .max(200, "Straße zu lang"),
  email: emailSchema,
  password: passwordSchema,
});

/** OTP: 6–8 alphanumerische Zeichen (Supabase E-Mail-OTP) */
export const otpVerifySchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{6,8}$/, "OTP muss 6–8 Zeichen sein"),
});

export const otpResendSchema = z.object({
  email: emailSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
