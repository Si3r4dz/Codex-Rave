import { getEverhourClient } from '../everhour';
import { EverhourTimeEntry } from '@/types';

export async function fetchCurrentUserTimeEntries(
  fromDate: string,
  toDate: string
) {
  const client = getEverhourClient();
  const user = await client.getCurrentUser();
  const entries = await client.getTimeEntries(fromDate, toDate, user.id);
  return { user, entries };
}

export async function fetchProjectNamesMap() {
  const client = getEverhourClient();
  const projects = await client.getProjects();
  return new Map(projects.map(p => [p.id, p.name]));
}

export function getProjectIdFromEntry(entry: EverhourTimeEntry): string {
  return entry.task.projects?.[0] || 'unknown';
}

