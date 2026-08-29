import type { SetupStepProps } from "./AboutStep";
import SetupField, { SetupSection, setupInputClasses } from "./SetupField";

/** Step two: where the organization is, how to reach it, what it raises. */
const ReachStep = ({ form, setField }: SetupStepProps) => (
  <div className="flex flex-col gap-9">
    <SetupSection title="Where you work">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SetupField label="City" required>
          <input
            className={setupInputClasses}
            value={form.city}
            onChange={(event) => setField("city", event.target.value)}
            data-cy="org-city"
          />
        </SetupField>

        <SetupField label="Country" required>
          <input
            className={setupInputClasses}
            value={form.country}
            onChange={(event) => setField("country", event.target.value)}
            data-cy="org-country"
          />
        </SetupField>

        <SetupField label="State or region">
          <input
            className={setupInputClasses}
            value={form.state}
            onChange={(event) => setField("state", event.target.value)}
            data-cy="org-state"
          />
        </SetupField>

        <SetupField label="How many people" required>
          <input
            type="number"
            min={1}
            className={setupInputClasses}
            value={form.teamSize}
            onChange={(event) => setField("teamSize", event.target.value)}
            data-cy="org-teamsize"
          />
        </SetupField>
      </div>
    </SetupSection>

    <SetupSection title="How people reach you">
      <SetupField label="Website">
        <input
          className={setupInputClasses}
          placeholder="karmacircle.org"
          value={form.website}
          onChange={(event) => setField("website", event.target.value)}
          data-cy="org-website"
        />
      </SetupField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SetupField label="Contact email">
          <input
            type="email"
            className={setupInputClasses}
            value={form.contactEmail}
            onChange={(event) => setField("contactEmail", event.target.value)}
            data-cy="org-contact-email"
          />
        </SetupField>

        <SetupField label="Contact phone">
          <input
            className={setupInputClasses}
            value={form.contactPhone}
            onChange={(event) => setField("contactPhone", event.target.value)}
            data-cy="org-contact-phone"
          />
        </SetupField>
      </div>
    </SetupSection>

    <SetupSection title="Funding">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SetupField
          label="Funds raised so far"
          hint="Your own figure, shown as stated by you"
        >
          <input
            type="number"
            min={0}
            className={setupInputClasses}
            value={form.fundsRaised}
            onChange={(event) => setField("fundsRaised", event.target.value)}
            data-cy="org-funds-raised"
          />
        </SetupField>

        <SetupField label="Funds you are trying to raise">
          <input
            type="number"
            min={0}
            className={setupInputClasses}
            value={form.fundsGoal}
            onChange={(event) => setField("fundsGoal", event.target.value)}
            data-cy="org-funds-goal"
          />
        </SetupField>
      </div>
    </SetupSection>
  </div>
);

export default ReachStep;
