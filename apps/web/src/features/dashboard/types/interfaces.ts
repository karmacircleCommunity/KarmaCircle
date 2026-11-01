/** Sanitized owner-account profile nested in `GET /organizations/dashboard`. */
export interface DashboardProfileUser {
  _id?: string;
  userName?: string;
  name?: string;
  description?: string;
  config?: {
    hasCompletedProfile?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface DashboardProfileResponse {
  user?: DashboardProfileUser;
}

export interface DashboardOrganization {
  id: string;
  handle: string;
  name: string;
  ownerEmail: string;
  tag?: string;
  domains: string[];
  description?: string;
  teamSize?: number;
  location: {
    city?: string;
    state?: string;
    address?: string;
    mapIframe?: string;
  };
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  logo?: string;
  cover?: string;
  gallery: string[];
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  leadership: Array<{ name: string; title: string; photo?: string; bio?: string }>;
  sponsorship: { enabled: boolean };
  fundsRaised?: number;
  fundsGoal?: number;
  raisedViaPlatform: number;
  followers: number;
  status: "draft" | "live" | "suspended";
  verified: boolean;
  members: Array<{ email: string; role: "owner" | "admin" | "editor"; addedAt: string }>;
  createdAt: string;
  missingFields: string[];
  isLive: boolean;
}

export interface OrganizationDashboardData {
  includesDemoData: boolean;
  period: { days: number };
  organization: DashboardOrganization;
  profile: DashboardProfileUser;
  metrics: {
    followers: number;
    following: number;
    hostedEvents: number;
    supporters: number;
    verifiedSupporters: number;
    raisedViaPlatform: number;
    demoSupporters: number;
    demoRaisedViaPlatform: number;
    profileViews: { last7Days: number; last30Days: number };
    eventRegistrations: number;
  };
  viewsByDay: Array<{ _id: string; views: number; demoViews?: number }>;
  events: Array<{
    uid: string;
    name: string;
    startTime: string;
    mode: "Online" | "Offline";
    city?: string;
    coverImage?: string;
    description?: string;
    registrations: number;
    isDemo: boolean;
  }>;
  supporters: Array<{
    name: string;
    amount: number;
    currency: string;
    supportedAt: string;
    isDemo: boolean;
  }>;
  followers: Array<{ name: string; userName?: string; followedAt: string; isDemo: boolean }>;
}
