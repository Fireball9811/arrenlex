import { z, type ZodError } from "zod"

/**
 * Schemas de validación compartidos para toda la aplicación.
 * Usa Zod para validar inputs de forma segura y consistente.
 */

/** Zod 4 expone los fallos en `.issues` (ya no en `.errors`). */
export function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(". ")
}

/**
 * Email validation schema - RFC 5322 compliant pero práctico
 *
 * Valida emails con formato estándar sin ser excesivamente estricto.
 * Rechaza espacios, caracteres inválidos, y requiere al menos un @ y un dominio válido.
 */
export const emailSchema = z
  .string()
  .min(1, "El correo electrónico es requerido")
  .max(254, "El correo electrónico es demasiado largo") // RFC 5321
  .email("Formato de correo electrónico inválido")
  .toLowerCase()
  .transform((val) => val.trim())

/**
 * Username validation schema
 *
 * - Mínimo 3 caracteres, máximo 30
 * - Solo letras, números, guiones y guiones bajos
 * - No puede empezar o terminar con guion
 */
export const usernameSchema = z
  .string()
  .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
  .max(30, "El nombre de usuario no puede exceder 30 caracteres")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/,
    "El nombre de usuario solo puede contener letras, números, guiones y guiones bajos, y no puede empezar o terminar con guion"
  )

/**
 * Password validation schema - básico
 *
 * - Mínimo 8 caracteres
 * - Recomendación: usar regex más estricto según requisitos
 */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga")

/**
 * Strong password validation schema (opcional)
 *
 * - Mínimo 8 caracteres
 * - Al menos una mayúscula
 * - Al menos una minúscula
 * - Al menos un número
 * - Al menos un carácter especial
 */
export const strongPasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga")
  .regex(/[A-Z]/, "La contraseña debe contener al menos una mayúscula")
  .regex(/[a-z]/, "La contraseña debe contener al menos una minúscula")
  .regex(/[0-9]/, "La contraseña debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "La contraseña debe contener al menos un carácter especial")

/**
 * Phone number validation (Colombia)
 *
 * Acepta formatos como:
 * - 3001234567
 * - +57 300 123 4567
 * - (300) 123-4567
 */
export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, "")) // Solo dígitos
  .refine((val) => val.length >= 10, "El número de teléfono debe tener al menos 10 dígitos")
  .refine((val) => val.length <= 15, "El número de teléfono es demasiado largo")

/**
 * Colombian ID (Cédula) validation
 *
 * - Mínimo 6 dígitos, máximo 12
 * - Solo numérico
 */
export const cedulaSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, "")) // Solo dígitos
  .refine((val) => val.length >= 6, "La cédula debe tener al menos 6 dígitos")
  .refine((val) => val.length <= 12, "La cédula no puede exceder 12 dígitos")

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z.union([
    emailSchema,
    usernameSchema, // Acepta username o email
  ]),
  password: passwordSchema,
})

/**
 * Password reset request schema
 */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
})

/**
 * Password reset confirmation schema
 */
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "El token es requerido"),
  newPassword: passwordSchema,
})

/**
 * Update email schema
 */
export const updateEmailSchema = z.object({
  newEmail: emailSchema,
})

/**
 * Update password schema
 */
export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: passwordSchema,
})

/**
 * Update username schema
 */
export const updateUsernameSchema = z.object({
  newUsername: usernameSchema,
})

/**
 * Contact form schema
 */
export const contactFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido").max(100, "El nombre es demasiado largo"),
  celular: phoneSchema,
  email: emailSchema,
  tipo: z.enum(["propietario", "arrendatario"], {
    message: "El tipo debe ser 'propietario' o 'arrendatario'",
  }),
})

/**
 * Role validation schema
 */
export const roleSchema = z.enum([
  "admin",
  "propietario",
  "inquilino",
  "maintenance_special",
  "insurance_special",
  "lawyer_special",
], {
  message: "Rol no válido",
})

/**
 * UUID validation schema
 */
export const uuidSchema = z
  .string()
  .uuid("ID inválido")
  .transform((val) => val.toLowerCase())

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .url("URL inválida")
  .transform((val) => val.trim())

/**
 * Date validation schema (ISO string)
 */
export const dateSchema = z
  .string()
  .datetime("Fecha inválida")
  .transform((val) => new Date(val))

/**
 * Positive number schema (for prices, quantities, etc.)
 */
export const positiveNumberSchema = z
  .number({ message: "Debe ser un número" })
  .positive("Debe ser mayor a 0")

/**
 * Non-negative integer schema
 */
export const nonNegativeIntegerSchema = z
  .number({ message: "Debe ser un número" })
  .int("Debe ser un número entero")
  .nonnegative("Debe ser mayor o igual a 0")

// Type exports for TypeScript inference
export type LoginInput = z.infer<typeof loginSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>
export type ContactFormInput = z.infer<typeof contactFormSchema>
export type UserRole = z.infer<typeof roleSchema>
