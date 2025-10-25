import { object, string, email } from "zod";

const getEmailSchema = () =>
  email({ error: "Email is required" }).min(6, "A valid email is required");

const getNameSchema = () =>
  string({ error: "Name is required" })
    .min(1, "Name is required")
    .max(20, "Name must be less than 20 characters");

const getPasswordSchema = () =>
  string({ error: "Password is required " })
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must not exceed 32 characters");

const getConfirmPasswordSchema = () =>
  string({ error: "This field is required" })
    .min(8, "Must contain at least 8 characters")
    .max(32, "Must not exceed 32 characters");

const getUserAgent = () => string().optional();

export const signupSchema = object({
  name: getNameSchema(),
  email: getEmailSchema(),
  password: getPasswordSchema(),
  confirmPassword: getConfirmPasswordSchema(),
  userAgent: getUserAgent(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = object({
  email: getEmailSchema(),
  password: getPasswordSchema(),
  userAgent: getUserAgent(),
});

export const nameSchema = object({
  name: getNameSchema(),
});

export const emailSchema = object({
  email: getEmailSchema(),
});

export const resetPasswordSchema = object({
  password: getPasswordSchema(),
  confirmPassword: getConfirmPasswordSchema(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
