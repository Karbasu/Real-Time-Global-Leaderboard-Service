import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Entity Types
export const getEntityTypes = () => apiClient.get('/entities/types');

export const createEntityType = (data: {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) => apiClient.post('/entities/types', data);

export const getEntityType = (id: string) =>
  apiClient.get(`/entities/types/${id}`);

// Entity Instances
export const getEntityInstances = (
  typeId: string,
  limit?: number,
  offset?: number
) =>
  apiClient.get(`/entities/types/${typeId}/instances`, {
    params: { limit, offset },
  });

export const createEntityInstance = (
  typeId: string,
  data: {
    externalId: string;
    initialState: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) => apiClient.post(`/entities/types/${typeId}/instances`, data);

export const getEntityInstance = (id: string) =>
  apiClient.get(`/entities/instances/${id}`);

export const getCurrentStateFast = (typeId: string, externalId: string) =>
  apiClient.get(`/entities/types/${typeId}/instances/external/${externalId}/current`);

// Events
export const applyEvent = (
  instanceId: string,
  data: {
    eventType: string;
    payload: Record<string, unknown>;
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
) => apiClient.post(`/entities/instances/${instanceId}/events`, data);

// Queries
export const getEventHistory = (
  instanceId: string,
  limit?: number,
  offset?: number
) =>
  apiClient.get(`/queries/instances/${instanceId}/history`, {
    params: { limit, offset },
  });

export const getStateAtVersion = (instanceId: string, version: number) =>
  apiClient.get(`/queries/instances/${instanceId}/state/at-version/${version}`);

export const getStateAtTimestamp = (instanceId: string, timestamp: string) =>
  apiClient.get(`/queries/instances/${instanceId}/state/at-time`, {
    params: { timestamp },
  });

export const compareVersions = (
  instanceId: string,
  version1: number,
  version2: number
) =>
  apiClient.get(`/queries/instances/${instanceId}/compare`, {
    params: { version1, version2 },
  });

export const getFieldTimeline = (instanceId: string, field: string) =>
  apiClient.get(`/queries/instances/${instanceId}/timeline/${field}`);

// Analytics
export const getEventTimeSeries = (
  entityTypeName: string,
  startTime: string,
  endTime: string,
  interval?: string
) =>
  apiClient.get(`/analytics/entity-types/${entityTypeName}/time-series`, {
    params: { startTime, endTime, interval },
  });

export const getFieldAggregation = (typeId: string, field: string) =>
  apiClient.get(`/analytics/entity-types/${typeId}/field-aggregation/${field}`);

export const getMostActiveEntities = (entityTypeName: string, limit?: number) =>
  apiClient.get(`/analytics/entity-types/${entityTypeName}/most-active`, {
    params: { limit },
  });

export const getSummaryStatistics = (entityTypeName: string) =>
  apiClient.get(`/analytics/entity-types/${entityTypeName}/summary`);

// Health
export const getHealth = () => apiClient.get('/health');
