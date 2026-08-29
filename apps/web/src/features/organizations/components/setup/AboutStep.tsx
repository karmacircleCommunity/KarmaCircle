import { MAX_DOMAINS } from "../../constants/organizationSetup";
import type {
  OrganizationSetupField,
  OrganizationSetupForm,
  OrganizationTaxonomy,
} from "../../types";
import SetupField, { setupInputClasses } from "./SetupField";

export type SetupStepProps = {
  form: OrganizationSetupForm;
  setField: <K extends OrganizationSetupField>(
    key: K,
    value: OrganizationSetupForm[K],
  ) => void;
  taxonomy?: OrganizationTaxonomy;
};

/** Step one: who the organization is and what it works on. */
const AboutStep = ({ form, setField, taxonomy }: SetupStepProps) => {
  const atDomainLimit = form.domains.length >= MAX_DOMAINS;

  const toggleDomain = (domain: string) => {
    const picked = form.domains.includes(domain);
    if (!picked && atDomainLimit) return;
    setField(
      "domains",
      picked
        ? form.domains.filter((item) => item !== domain)
        : [...form.domains, domain],
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SetupField label="Organization name" required>
        <input
          className={setupInputClasses}
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          data-cy="org-name"
        />
      </SetupField>

      <SetupField
        label="What you do"
        required
        hint="A couple of lines on the work you run, who it reaches, and where."
      >
        <textarea
          className={`${setupInputClasses} min-h-32 resize-y`}
          value={form.description}
          maxLength={4000}
          onChange={(event) => setField("description", event.target.value)}
          placeholder="We clear and rebuild riverbank homes after the monsoon, and run a year-round flood-readiness drive with local schools."
          data-cy="org-description"
        />
      </SetupField>

      <SetupField label="What kind of organization" required>
        <select
          className={setupInputClasses}
          value={form.tag}
          onChange={(event) => setField("tag", event.target.value)}
          data-cy="org-tag"
        >
          <option value="">Pick one</option>
          {(taxonomy?.tags ?? []).map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </SetupField>

      <SetupField
        label="Causes you work on"
        required
        hint={`Pick up to ${MAX_DOMAINS}. These are the filters people find you by.`}
      >
        {/* Chips rather than a multi-select: on a phone a native
            multi-select is a scroll trap, and the list is short enough to
            show in full. */}
        <ul className="flex list-none flex-wrap gap-2 p-0">
          {(taxonomy?.domains ?? []).map((domain) => {
            const picked = form.domains.includes(domain);
            const blocked = !picked && atDomainLimit;
            return (
              <li key={domain}>
                <button
                  type="button"
                  onClick={() => toggleDomain(domain)}
                  aria-pressed={picked}
                  disabled={blocked}
                  data-cy={`org-domain-${domain}`}
                  className={`rounded-full px-3.5 py-1.5 font-outfit text-body transition-colors duration-200 ${
                    picked
                      ? "cursor-pointer border border-brand bg-brand/10 text-brand"
                      : blocked
                        ? "cursor-not-allowed border border-brand-secondary/10 bg-white text-ink/30"
                        : "cursor-pointer border border-brand-secondary/15 bg-white text-ink/70 hover:border-brand/40"
                  }`}
                >
                  {domain}
                </button>
              </li>
            );
          })}
        </ul>
      </SetupField>
    </div>
  );
};

export default AboutStep;
