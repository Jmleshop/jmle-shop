import { z } from "zod";

// Meldungen auf Arabisch: werden nur auf der (rein arabischen) Kundenseite angezeigt.

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("البريد الإلكتروني غير صالح")
  .max(254, "البريد الإلكتروني طويل جداً");

/** Mind. 8 Zeichen, Buchstabe + Ziffer (DE-E-Commerce / OWASP-Basis) */
const passwordSchema = z
  .string()
  .min(8, "كلمة المرور 8 أحرف على الأقل")
  .max(128, "كلمة المرور طويلة جداً")
  .regex(/[A-Za-zÄÖÜäöüß]/, "كلمة المرور تحتاج إلى حرف واحد على الأقل")
  .regex(/[0-9]/, "كلمة المرور تحتاج إلى رقم واحد على الأقل");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "كلمة المرور مطلوبة").max(128),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "الاسم الأول مطلوب")
    .max(80, "الاسم الأول طويل جداً"),
  lastName: z
    .string()
    .trim()
    .min(1, "اسم العائلة مطلوب")
    .max(80, "اسم العائلة طويل جداً"),
  street: z
    .string()
    .trim()
    .min(1, "الشارع مطلوب")
    .max(200, "اسم الشارع طويل جداً"),
  email: emailSchema,
  password: passwordSchema,
});

/** OTP: 6–8 alphanumerische Zeichen (Supabase E-Mail-OTP) */
export const otpVerifySchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{6,8}$/, "الرمز يجب أن يكون من 6 إلى 8 خانات"),
});

export const otpResendSchema = z.object({
  email: emailSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
