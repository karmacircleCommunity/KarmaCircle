/**
 * The minimal shape the shared setup-flow shell (`@components/setup/`)
 * needs from any flow's own step list — organization setup's
 * `OrganizationSetupStepStatus` and profile setup's `ProfileSetupStepStatus`
 * both satisfy this structurally, without extending it explicitly.
 */
export interface SetupStepStatus {
  id: string;
  title: string;
  current: boolean;
}
