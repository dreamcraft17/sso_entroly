import { z } from "zod";

export const loginSchema = z.object({
    identifier: z
        .string()
        .min(3, "Username or email must be at least 3 characters")
        .max(100, "Input too long"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
    email: z
        .string()
        .email("Invalid email address"),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username too long")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name too long"),
});

export const changePasswordSchema = z.object({
    oldPassword: z
        .string()
        .min(1, "Current password is required"),
    newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z
        .string()
        .min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
