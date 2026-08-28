import type { IconType } from "react-icons";

/**
 * The icon slot every landing-page content record shares. Kept as an alias
 * rather than repeating `IconType` inline so the three content arrays in
 * `constants/landingContent.ts` are visibly the same kind of record.
 */
export type LandingIcon = IconType;
