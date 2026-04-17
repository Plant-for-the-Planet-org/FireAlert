import {z} from 'zod';
import {SiteIncidentReviewStatus} from '@prisma/client';

/**
 * Schema for review status values
 */
export const reviewStatusSchema = z.nativeEnum(SiteIncidentReviewStatus);

/**
 * Schema for getting a single incident by ID
 */
export const getIncidentSchema = z.object({
  incidentId: z.string().cuid({message: 'Invalid CUID'}),
});

/**
 * Schema for getting all related incidents for a given incident ID
 */
export const getRelatedIncidentsSchema = getIncidentSchema;

/**
 * Schema for getting active incidents for a site
 */
export const getActiveIncidentsSchema = z.object({
  siteId: z.string().cuid(),
});

/**
 * Schema for getting incident history with date range
 */
export const getIncidentHistorySchema = z
  .object({
    siteId: z.string().cuid(),
    startDate: z.date().or(z.string().transform(str => new Date(str))),
    endDate: z.date().or(z.string().transform(str => new Date(str))),
  })
  .refine(data => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  });

/**
 * Schema for updating incident review status
 */
export const updateIncidentReviewStatusSchema = z.object({
  incidentId: z.string().cuid(),
  status: reviewStatusSchema,
});

/**
 * Schema for closing an incident (admin operation)
 */
export const closeIncidentSchema = z.object({
  incidentId: z.string().cuid(),
});

/**
 * Schema for validating inactivity threshold
 */
export const inactivityThresholdSchema = z.number().positive().int();
