export { default as Home } from "@features/landing-home/pages/Home";

// Auth routes are not re-exported from here — routesConfig.tsx lazy-loads
// `Auth` directly so it actually gets code-split (see known-issues.md's
// now-fixed [INEFFECTIVE_DYNAMIC_IMPORT] entry).

// User Routes
export { default as UserProfile } from "@features/onboarding-profile/pages/UserProfile";

// Organization Routes
export { default as Organizations } from "@features/organizations/pages/Organizations";
export { default as OrganizationProfile } from "@features/organizations/pages/OrganizationProfile";
export { default as OrganizationSetup } from "@features/organizations/pages/OrganizationSetup";
export { default as Dashboard } from "@features/dashboard/pages/Dashboard";
export { default as Events } from "@features/events/pages/Events";
export { default as DetailedEvent } from "@features/events/pages/DetailedEvent";
export { default as YourEvents } from "@features/events/pages/YourEvents";

export { default as Profile } from "@features/onboarding-profile/pages/Profile";

// Not found page
export { default as Error404 } from "@features/error-handling/pages/Error404";
