// src/config/footerLinksConfig.js

export const footerLinks = {
  quickStarts: [
    { name: "Trending Events", path: "/trending" },
    { name: "NGOs near you", path: "/clubs" },
    { name: "Login / Signup", path: "/auth/login" },
    { name: "Events ", path: "/events" },
  ],
  resources: [
    { name: "GitHub", path: "https://github.com/ngoworldcommunity/NGOWorld" },
    {
      name: "Setup Frontend",
      path: "https://github.com/ngoworldcommunity/NGOWorld/blob/main/docs/FrontendSetup.md",
    },
    {
      name: "Setup Backend",
      path: "https://github.com/ngoworldcommunity/NGOWorld-Backend/blob/main/docs/BackendSetup.md",
    },
    {
      name: "Docker Resources",
      path: "https://github.com/ngoworldcommunity/NGOWorld/blob/main/docs/DockerSetup.md",
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
      path: "https://github.com/ngoworldcommunity",
      icon: "FaGithub",
    },
  ],
};
