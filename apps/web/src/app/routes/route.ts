export { default as Home } from "@features/landing-home/pages/Home";

// Auth routes are not re-exported from here — routesConfig.tsx lazy-loads
// `Auth` directly so it actually gets code-split (see known-issues.md's
// now-fixed [INEFFECTIVE_DYNAMIC_IMPORT] entry).

// User Routes
export { default as UserProfile } from "@features/onboarding-profile/pages/UserProfile";

// Organization Routes
export { default as Organizations } from "@features/organizations/pages/Organizations";
export { default as OrganizationProfile } from "@features/organizations/pages/OrganizationProfile";
export { default as Dashboard } from "@features/dashboard/pages/Dashboard";
export { default as Events } from "@features/events/pages/Events";

// Shop Routes
export { default as Shop } from "@features/donate-shop-trending/pages/Shop";

export { default as Profile } from "@features/onboarding-profile/pages/Profile";

// Not found page
export { default as Error404 } from "@features/error-handling/pages/Error404";
