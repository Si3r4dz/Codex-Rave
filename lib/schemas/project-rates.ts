import { z } from 'zod';

export const ProjectRateSchema = z.object({
  everhour_project_id: z.string().min(1, 'Project ID is required'),
  project_name: z.string().min(1, 'Project name is required'),
  hourly_rate: z.number().positive('Hourly rate must be positive'),
});

export const DeleteProjectRateSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)),
});

export type ProjectRateInput = z.infer<typeof ProjectRateSchema>;

