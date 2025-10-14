import { EverhourTimeEntry, EverhourProject } from '@/types';

const EVERHOUR_API_BASE = 'https://api.everhour.com';

class EverhourClient {
  private apiToken: string;

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error('Everhour API token is required');
    }
    this.apiToken = apiToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${EVERHOUR_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Api-Key': this.apiToken,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(`Everhour API error: ${response.status} ${response.statusText} - ${errorText} ${url}`);
    }
    return response.json();
  }

  async getTimeEntries(from: string, to: string, userId?: number): Promise<EverhourTimeEntry[]> {
    // Use user-specific endpoint if userId provided, otherwise try team endpoint
    // Member role users can only access their own time via /users/{userId}/time
    const endpoint = userId 
      ? `/users/${userId}/time?from=${from}&to=${to}`
      : `/team/time?from=${from}&to=${to}`;
    return this.request<EverhourTimeEntry[]>(endpoint);
  }

  async getProjects(): Promise<EverhourProject[]> {
    return this.request<EverhourProject[]>('/projects');
  }

  async getCurrentUser(): Promise<{ id: number; [key: string]: any }> {
    return this.request('/users/me');
  }
}

// Singleton instance
let everhourClient: EverhourClient | null = null;

export function getEverhourClient(): EverhourClient {
  const apiToken = process.env.EVERHOUR_API_TOKEN;
  
  if (!apiToken) {
    throw new Error('EVERHOUR_API_TOKEN environment variable is not set');
  }

  if (!everhourClient) {
    everhourClient = new EverhourClient(apiToken);
  }

  return everhourClient;
}

export default EverhourClient;

