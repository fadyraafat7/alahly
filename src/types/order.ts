import { z } from 'zod'

export const customerOrderSchema = z.object({
  id: z.number().int().positive(),
  number: z.string().min(1),
  status: z.string().min(1),
  total: z.string().regex(/^\d+(\.\d+)?$/).refine((value) => Number.isFinite(Number(value))),
  currency: z.string().regex(/^[A-Z]{3}$/),
  date_created: z.iso.datetime({ offset: true }).nullable(),
})

export const customerOrdersSchema = z.array(customerOrderSchema)
export type CustomerOrder = z.infer<typeof customerOrderSchema>
