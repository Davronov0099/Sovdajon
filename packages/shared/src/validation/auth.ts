import { z } from 'zod';
import { passwordSchema } from './common';

export const loginSchema = z.object({
  login: z.string().min(3).max(50),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const createUserSchema = z.object({
  login: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Faqat harf, raqam va _ ruxsat'),
  password: passwordSchema,
  name: z.string().min(2).max(100),
  role: z.enum(['ADMIN', 'CASHIER', 'HELPER']),
  phone: z
    .string()
    .regex(/^\+998\d{9}$/)
    .optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+998\d{9}$/)
    .optional(),
  role: z.enum(['ADMIN', 'CASHIER', 'HELPER']).optional(),
  isActive: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
