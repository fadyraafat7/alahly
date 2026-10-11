import { z } from 'zod'

export const authSessionSchema = z.object({
  token: z.string().min(1),
  user: z.object({ id: z.number().int().positive(), email: z.string(), name: z.string() }),
})

export const registrationSettingsSchema = z.object({
  enabled: z.boolean(),
  generate_password: z.boolean(),
  generate_username: z.boolean(),
})

export const registrationResultSchema = z.discriminatedUnion('authenticated', [
  authSessionSchema.extend({ authenticated: z.literal(true) }),
  z.object({ authenticated: z.literal(false), message: z.string() }),
])

export interface RegistrationInput {
  first_name: string
  last_name: string
  email: string
  username?: string
  password?: string
}

export type AuthSession = z.infer<typeof authSessionSchema>
export type RegistrationResult = z.infer<typeof registrationResultSchema>
