import { z } from 'zod';

export const createCaseSchema = z.object({
  body: z.object({
    treatmentPlanId: z.string().min(1, 'treatmentPlanId is required'),
    requestedAmount: z.number().positive('requestedAmount must be positive'),
  }),
});

export const approveCaseSchema = z.object({
  body: z.object({
    approvedAmount: z.number().positive('approvedAmount must be positive'),
    decisionComment: z.string().min(3, 'decisionComment is required'),
  }),
});

export const rejectCaseSchema = z.object({
  body: z.object({
    reason: z.string().min(3, 'Rejection reason is required'),
  }),
});

export const reviewCaseSchema = z.object({
  body: z.object({
    reviewNote: z.string().min(3, 'Review note is required'),
  }),
});

export const addNoteSchema = z.object({
  body: z.object({
    note: z.string().min(1, 'Note content is required'),
  }),
});
