import { z } from 'zod';

export const cimCycleTimeSchema = z
  .object({
    modelName: z.string().min(1, 'Bắt buộc').max(100, 'Tối đa 100 ký tự'),

    partNumber: z.string().min(1, 'Bắt buộc').max(50, 'Tối đa 50 ký tự'),

    mfgType: z.string().min(1, 'Chọn MfgType').max(30, 'Tối đa 30 ký tự'),

    stage: z.string().min(1, 'Bắt buộc').max(50, 'Tối đa 50 ký tự'),

    stageDes: z.string().max(200, 'Tối đa 200 ký tự').optional().or(z.literal('')),

    cycleTime: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => v === '' || v == null || !Number.isNaN(Number(v)), { message: 'Phải là số' })
      .refine((v) => v === '' || v == null || Number(v) >= 0, { message: 'Phải ≥ 0' }),

    peopleCount: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => v === '' || v == null || (!Number.isNaN(Number(v)) && Number.isInteger(Number(v))),
        { message: 'Phải là số nguyên' }
      )
      .refine((v) => v === '' || v == null || Number(v) >= 0, { message: 'Phải ≥ 0' }),

    stationCount: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => v === '' || v == null || (!Number.isNaN(Number(v)) && Number.isInteger(Number(v))),
        { message: 'Phải là số nguyên' }
      )
      .refine((v) => v === '' || v == null || Number(v) >= 0, { message: 'Phải ≥ 0' }),

    effectiveFrom: z
      .string()
      .min(1, 'Bắt buộc')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng yyyy-MM-dd'),

    effectiveTo: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: 'Định dạng yyyy-MM-dd' }),
  })
  .refine(
    (data) => !data.effectiveTo || !data.effectiveFrom || data.effectiveTo >= data.effectiveFrom,
    {
      message: 'Effective To phải ≥ Effective From',
      path: ['effectiveTo'],
    }
  );

/** Chạy validate, trả về { success, data, errors }
 *  errors: Record<fieldName, string>
 */
export function validateCctForm(form) {
  const result = cimCycleTimeSchema.safeParse(form);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }
  const errors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return { success: false, data: null, errors };
}
