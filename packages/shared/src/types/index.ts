// Shared types for the application

export interface User {
  id: string;
  email: string;
  role: UserRole;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  organization?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'field_worker' | 'viewer';

export interface WaterSite {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
  type: WaterSiteType;
  status: SiteStatus;
  created_at: string;
  updated_at: string;
}

export type WaterSiteType = 'borehole' | 'well' | 'pump_station' | 'treatment_plant';
export type SiteStatus = 'active' | 'inactive' | 'maintenance' | 'offline';