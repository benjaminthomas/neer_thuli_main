// Shared constants

export const APP_NAME = 'Neer Thuli';
export const APP_DESCRIPTION = 'Water Infrastructure Monitoring Platform';

export const SITE_TYPES = {
  BOREHOLE: 'borehole' as const,
  WELL: 'well' as const,
  PUMP_STATION: 'pump_station' as const,
  TREATMENT_PLANT: 'treatment_plant' as const,
};

export const SITE_STATUS = {
  ACTIVE: 'active' as const,
  INACTIVE: 'inactive' as const,
  MAINTENANCE: 'maintenance' as const,
  OFFLINE: 'offline' as const,
};

export const USER_ROLES = {
  ADMIN: 'admin' as const,
  MANAGER: 'manager' as const,
  FIELD_WORKER: 'field_worker' as const,
  VIEWER: 'viewer' as const,
};

export const API_ENDPOINTS = {
  USERS: '/api/users',
  SITES: '/api/sites',
  REPORTS: '/api/reports',
  MONITORING: '/api/monitoring',
} as const;