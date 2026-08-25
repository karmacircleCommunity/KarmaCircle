export interface FooterLink {
  name: string;
  path: string;
  icon?: string;
}

export const footerLinks: {
  quickStarts: FooterLink[];
  resources: FooterLink[];
  policies: FooterLink[];
  social: FooterLink[];
} = {
  quickStarts: [
    { name: "Trending Events", path: "/trending" },
    { name: "NGOs near you", path: "/organizations" },
    { name: "Login / Signup", path: "/auth/signin" },
    { name: "Events ", path: "/events" },
  ],
  resources: [
    { name: "GitHub", path: "https://github.com/karmacircleCommunity/KarmaCircle" },
    {
      name: "Setup Frontend",
      path: "https://github.com/karmacircleCommunity/KarmaCircle/blob/main/docs/FrontendSetup.md",
    },
    {
      name: "Setup Backend",
      path: "https://github.com/karmacircleCommunity/KarmaCircle/blob/main/apps/api/docs/BackendSetup.md",
    },
    {
      name: "Docker Resources",
      path: "https://github.com/karmacircleCommunity/KarmaCircle/blob/main/docs/DockerSetup.md",
    },
  ],
  policies: [
    { name: "Terms of Use", path: "/terms" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Cookies Policy", path: "/cookies" },
  ],
  social: [
    {
      name: "LinkedIn",
      path: "https://www.linkedin.com/company/ngoworld",
      icon: "FaLinkedinIn",
    },
    {
      name: "X",
      path: "https://x.com/ngoworlddotorg",
      icon: "FaXTwitter",
    },
    {
      name: "GitHub",
      path: "https://github.com/karmacircleCommunity",
      icon: "FaGithub",
    },
  ],
};
