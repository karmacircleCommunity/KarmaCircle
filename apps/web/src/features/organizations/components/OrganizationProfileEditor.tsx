import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FiArrowLeft,
  FiCheck,
  FiExternalLink,
  FiEye,
  FiMapPin,
} from "react-icons/fi";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { Footer, Navbar } from "@components";
import Button from "@components/buttons/Button";
import SetupFieldLabel from "@components/setup/SetupFieldLabel";
import { organizationEndpoints } from "@services/ApiEndpoints";
import { UpdateMyOrganization } from "@services/KarmaCircleApi";
import { STATUSCODE } from "@statics/Constants";
import { showErrorToast, showSuccessToast } from "@utils/Toasts";
import { mutate as mutateSWR } from "swr";
import type {
  MyOrganization,
  OrganizationSetupField,
  OrganizationSetupForm,
  OrganizationTaxonomy,
} from "../types";
import {
  toSetupForm,
  sanitizeSetupValue,
  validateSetupField,
} from "../utils/organizationSetupForm";
import {
  FIELD_SPECS,
  MAX_DOMAINS,
  REQUIRED_LABELS,
} from "../constants/organizationSetup";
import { monogram } from "../utils/monogram";

type Props = {
  organization: MyOrganization;
  taxonomy?: OrganizationTaxonomy;
};

const EDITABLE_FIELDS: OrganizationSetupField[] = [
  "name",
  "description",
  "tag",
  "domains",
  "teamSize",
  "city",
  "state",
  "address",
  "website",
  "contactEmail",
  "contactPhone",
  "socialInstagram",
  "socialFacebook",
  "socialTwitter",
  "socialLinkedin",
  "socialYoutube",
];

const REQUIRED_FIELDS: OrganizationSetupField[] = [
  "name",
  "description",
  "tag",
  "domains",
  "teamSize",
  "city",
];

const SOCIAL_FIELDS = [
  { field: "socialInstagram", label: "Instagram", Icon: FaInstagram },
  { field: "socialFacebook", label: "Facebook", Icon: FaFacebook },
  { field: "socialTwitter", label: "X", Icon: FaXTwitter },
  { field: "socialLinkedin", label: "LinkedIn", Icon: FaLinkedin },
  { field: "socialYoutube", label: "YouTube", Icon: FaYoutube },
] as const;

const SECTION_LINKS = [
  { id: "organization-profile", label: "Profile basics" },
  { id: "organization-contact", label: "Location & contact" },
  { id: "organization-social", label: "Social profiles" },
] as const;

const OrganizationProfilePreview = ({
  form,
}: {
  form: OrganizationSetupForm;
}) => {
  const selectedSocialCount = SOCIAL_FIELDS.filter(({ field }) =>
    form[field].trim(),
  ).length;

  return (
    <section className="rounded-2xl border border-brand-secondary/10 bg-white p-5 shadow-[0_8px_30px_-26px_var(--color-brand-secondary)]">
      <div className="flex items-center gap-2 font-outfit text-body font-semibold text-brand-secondary">
        <FiEye aria-hidden="true" className="size-4 text-brand" />
        Profile preview
      </div>
      <p className="mt-1.5 mb-0 font-outfit text-caption text-ink/55">
        Updates as you edit. Public page changes after save.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand/10 font-outfit text-xl font-semibold text-brand-secondary">
          {monogram(form.name || "Your organization")}
        </span>
        <div className="min-w-0">
          <p className="m-0 truncate font-outfit text-lg font-semibold text-brand-secondary">
            {form.name.trim() || "Organization name"}
          </p>
          <p className="mt-1 mb-0 truncate font-outfit text-caption text-ink/60">
            {[form.tag, form.city].filter(Boolean).join(" · ") || "Type · city"}
          </p>
        </div>
      </div>
      <p className="mt-4 mb-0 line-clamp-3 font-poppins text-body leading-6 text-ink/70">
        {form.description.trim() ||
          "Your organization description will appear here."}
      </p>
      {form.domains.length > 0 && (
        <ul
          className="mt-4 mb-0 flex flex-wrap gap-2 p-0"
          aria-label="Focus areas preview"
        >
          {form.domains.slice(0, 3).map((domain) => (
            <li
              key={domain}
              className="list-none rounded-full bg-brand/5 px-3 py-1.5 font-outfit text-caption text-brand-secondary"
            >
              {domain}
            </li>
          ))}
          {form.domains.length > 3 && (
            <li className="list-none rounded-full bg-brand/5 px-3 py-1.5 font-outfit text-caption text-brand-secondary">
              +{form.domains.length - 3}
            </li>
          )}
        </ul>
      )}
      {(form.website.trim() ||
        form.contactEmail.trim() ||
        form.city.trim()) && (
        <div className="mt-5 space-y-2 border-t border-brand-secondary/10 pt-4 font-outfit text-caption text-ink/65">
          {form.city.trim() && (
            <p className="m-0 flex items-center gap-2 truncate">
              <FiMapPin
                aria-hidden="true"
                className="size-3.5 shrink-0 text-brand"
              />
              {form.city.trim()}
            </p>
          )}
          {form.website.trim() && (
            <p className="m-0 truncate">{form.website.trim()}</p>
          )}
          {form.contactEmail.trim() && (
            <p className="m-0 truncate">{form.contactEmail.trim()}</p>
          )}
        </div>
      )}
      <p className="mt-4 mb-0 border-t border-brand-secondary/10 pt-4 font-outfit text-caption text-ink/55">
        {selectedSocialCount === 0
          ? "No social links added"
          : `${selectedSocialCount} social ${selectedSocialCount === 1 ? "profile" : "profiles"} added`}
      </p>
    </section>
  );
};

function organizationPayload(form: OrganizationSetupForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    tag: form.tag,
    domains: form.domains,
    teamSize: Number(form.teamSize),
    city: form.city.trim(),
    state: form.state.trim(),
    address: form.address.trim(),
    website: form.website.trim()
      ? /^https?:\/\//i.test(form.website.trim())
        ? form.website.trim()
        : `https://${form.website.trim()}`
      : "",
    contactEmail: form.contactEmail.trim(),
    contactPhone: form.contactPhone.trim(),
    socialLinks: {
      instagram: form.socialInstagram.trim(),
      facebook: form.socialFacebook.trim(),
      twitter: form.socialTwitter.trim(),
      linkedin: form.socialLinkedin.trim(),
      youtube: form.socialYoutube.trim(),
    },
  };
}

const OrganizationProfileEditor = ({ organization, taxonomy }: Props) => {
  const [form, setForm] = useState<OrganizationSetupForm>(() =>
    toSetupForm(organization),
  );
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    setForm(toSetupForm(organization));
  }, [organization.handle]);

  const errors = useMemo(() => {
    const next: Partial<Record<OrganizationSetupField, string>> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = form[field];
      if (typeof value === "string") {
        const error = validateSetupField(field, value);
        if (error) next[field] = error;
      }
    }
    for (const field of REQUIRED_FIELDS) {
      const value = form[field];
      const empty = Array.isArray(value)
        ? value.length === 0
        : typeof value === "string" && value.trim().length === 0;
      if (empty)
        next[field] = `${REQUIRED_LABELS[field] ?? "This field"} is required.`;
    }
    return next;
  }, [form]);

  const setText = (field: OrganizationSetupField, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: sanitizeSetupValue(field, value),
    }));
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length > 0) {
      const firstInvalid = EDITABLE_FIELDS.find((field) => errors[field]);
      if (firstInvalid) {
        document.getElementById(`organization-${firstInvalid}`)?.focus();
      }
      return;
    }

    setSaving(true);
    const response = await UpdateMyOrganization(organizationPayload(form));
    setSaving(false);

    if (response?.status !== STATUSCODE.OK) {
      showErrorToast(
        response?.data?.message ?? "Could not save changes. Try again.",
      );
      return;
    }

    const updated = response.data.organization as MyOrganization;
    setForm(toSetupForm(updated));
    await Promise.all([
      mutateSWR(organizationEndpoints.mine, updated, { revalidate: false }),
      mutateSWR(organizationEndpoints.byHandle(organization.handle)),
    ]);
    showSuccessToast("Organization profile updated");
  };

  const fieldClass = (field: OrganizationSetupField) =>
    `mt-2 w-full rounded-xl border bg-white px-4 py-3 font-outfit text-body text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15 ${
      showErrors && errors[field] ? "border-error" : "border-brand-secondary/15"
    }`;

  const textField = (
    field: OrganizationSetupField,
    label: string,
    options: {
      multiline?: boolean;
      required?: boolean;
      leadingIcon?: IconType;
    } = {},
  ) => {
    const spec = FIELD_SPECS[field];
    const value = form[field];
    if (typeof value !== "string") return null;
    const id = `organization-${field}`;
    const LeadingIcon = options.leadingIcon;
    return (
      <div className="relative min-w-0" key={field}>
        <SetupFieldLabel htmlFor={id} required={options.required}>
          {label}
        </SetupFieldLabel>
        {options.multiline ? (
          <textarea
            id={id}
            value={value}
            onChange={(event) => setText(field, event.target.value)}
            maxLength={spec?.maxLength}
            rows={5}
            className={`${fieldClass(field)} resize-y`}
            aria-invalid={Boolean(showErrors && errors[field])}
            aria-describedby={
              showErrors && errors[field] ? `${id}-error` : undefined
            }
          />
        ) : (
          <input
            id={id}
            type={
              spec?.type === "email" ||
              spec?.type === "tel" ||
              spec?.type === "number"
                ? spec.type
                : "text"
            }
            value={value}
            onChange={(event) => setText(field, event.target.value)}
            placeholder={spec?.placeholder}
            maxLength={spec?.maxLength}
            inputMode={spec?.inputMode}
            autoComplete={spec?.autoComplete}
            className={`${fieldClass(field)} ${options.leadingIcon ? "pl-11" : ""}`}
            aria-invalid={Boolean(showErrors && errors[field])}
            aria-describedby={
              showErrors && errors[field] ? `${id}-error` : undefined
            }
          />
        )}
        {LeadingIcon && (
          <LeadingIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-[2.95rem] left-4 size-4 text-ink/45"
          />
        )}
        {spec?.hint && (
          <p className="mt-1.5 mb-0 font-outfit text-caption text-ink/55">
            {spec.hint}
          </p>
        )}
        {showErrors && errors[field] && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 mb-0 font-outfit text-caption text-error"
          >
            {errors[field]}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-9 pt-6 pb-16 sm:px-10 sm:pt-8 lg:px-12">
        <Link
          to={`/organization/${organization.handle}`}
          className="inline-flex min-h-10 items-center gap-2 font-outfit text-body text-ink/65 no-underline hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <FiArrowLeft aria-hidden="true" /> Back to public profile
        </Link>
        <header className="mt-5 flex flex-col gap-4 border-b border-brand-secondary/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="m-0 font-outfit text-3xl font-semibold tracking-tight text-brand-secondary sm:text-4xl">
              Edit organization
            </h1>
            <p className="mt-2 mb-0 max-w-xl font-poppins text-body leading-6 text-ink/65">
              Keep {organization.name}’s details current so people know what you
              do and how to reach you.
            </p>
          </div>
          <Link
            to={`/organization/${organization.handle}`}
            className="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 font-outfit text-body font-medium text-brand no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          >
            View public profile <FiExternalLink aria-hidden="true" />
          </Link>
        </header>

        <div className="mt-6 grid items-start gap-x-8 gap-y-5 xl:grid-cols-[190px_minmax(0,1fr)_290px]">
          <nav
            aria-label="Organization editor sections"
            className="xl:sticky xl:top-24 xl:row-start-1"
          >
            <p className="mb-2 hidden font-outfit text-caption font-semibold text-ink/50 xl:block">
              JUMP TO
            </p>
            <ul className="-mx-9 flex list-none gap-2 overflow-x-auto px-9 pb-1 xl:mx-0 xl:flex-col xl:gap-1 xl:overflow-visible xl:px-0">
              {SECTION_LINKS.map((section) => (
                <li key={section.id} className="shrink-0">
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-10 items-center rounded-full border border-brand-secondary/10 bg-white px-4 font-outfit text-body text-ink/70 no-underline transition-colors hover:border-brand/35 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand xl:w-full xl:rounded-xl xl:border-transparent xl:bg-transparent xl:px-3"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            <details className="mb-5 rounded-xl border border-brand-secondary/10 bg-white xl:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-outfit text-body font-medium text-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                <FiEye aria-hidden="true" className="size-4 text-brand" />
                Preview public profile
              </summary>
              <div className="border-t border-brand-secondary/10 p-3">
                <OrganizationProfilePreview form={form} />
              </div>
            </details>

            <form onSubmit={save} noValidate className="min-w-0">
              <section
                id="organization-profile"
                aria-labelledby="profile-title"
                className="scroll-mt-28 border-b border-brand-secondary/10 pb-8"
              >
                <h2
                  id="profile-title"
                  className="m-0 font-outfit text-2xl font-semibold text-brand-secondary"
                >
                  Profile basics
                </h2>
                <p className="mt-1.5 mb-6 font-poppins text-body text-ink/60">
                  Tell people who you are and what your organization works on.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {textField("name", "Organization name", { required: true })}
                  <div className="min-w-0">
                    <SetupFieldLabel htmlFor="organization-tag" required>
                      Organization type
                    </SetupFieldLabel>
                    <select
                      id="organization-tag"
                      value={form.tag}
                      onChange={(event) => setText("tag", event.target.value)}
                      className={fieldClass("tag")}
                      aria-invalid={Boolean(showErrors && errors.tag)}
                      aria-describedby={
                        showErrors && errors.tag
                          ? "organization-tag-error"
                          : undefined
                      }
                    >
                      <option value="">Choose an organization type</option>
                      {(taxonomy?.tags ?? (form.tag ? [form.tag] : [])).map(
                        (tag) => (
                          <option key={tag} value={tag}>
                            {tag}
                          </option>
                        ),
                      )}
                    </select>
                    {showErrors && errors.tag && (
                      <p
                        id="organization-tag-error"
                        role="alert"
                        className="mt-1.5 mb-0 font-outfit text-caption text-error"
                      >
                        {errors.tag}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    {textField("description", "What your organization does", {
                      multiline: true,
                      required: true,
                    })}
                  </div>
                  <div className="max-w-sm">
                    {textField("teamSize", "Team size", { required: true })}
                  </div>
                </div>

                <fieldset
                  id="organization-domains"
                  tabIndex={-1}
                  className="mt-6 min-w-0 border-0 p-0 focus-visible:outline-2 focus-visible:outline-brand"
                  aria-invalid={Boolean(showErrors && errors.domains)}
                  aria-describedby={
                    showErrors && errors.domains
                      ? "organization-domains-error"
                      : undefined
                  }
                >
                  <legend className="font-outfit text-body font-medium text-ink/70">
                    Focus areas <span className="text-error">*</span>
                  </legend>
                  <p className="mt-1 mb-3 font-outfit text-caption text-ink/55">
                    Choose up to {MAX_DOMAINS} causes. Select all that fit.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                    {(taxonomy?.domains ?? form.domains).map((domain) => {
                      const selected = form.domains.includes(domain);
                      const disabled =
                        !selected && form.domains.length >= MAX_DOMAINS;
                      return (
                        <button
                          key={domain}
                          type="button"
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              domains: selected
                                ? current.domains.filter(
                                    (item) => item !== domain,
                                  )
                                : [...current.domains, domain],
                            }))
                          }
                          className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left font-outfit text-body transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 ${selected ? "border-brand/40 bg-brand/5 text-brand-secondary" : "border-brand-secondary/15 bg-white text-ink/70 hover:border-brand/40"}`}
                        >
                          <span>{domain}</span>
                          <span
                            className={`flex size-5 shrink-0 items-center justify-center rounded-full ${selected ? "bg-brand text-white" : "border border-brand-secondary/20 text-transparent"}`}
                          >
                            <FiCheck aria-hidden="true" className="size-3" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {showErrors && errors.domains && (
                    <p
                      id="organization-domains-error"
                      role="alert"
                      className="mt-2 mb-0 font-outfit text-caption text-error"
                    >
                      {errors.domains}
                    </p>
                  )}
                </fieldset>
              </section>

              <section
                id="organization-contact"
                aria-labelledby="contact-title"
                className="scroll-mt-28 border-b border-brand-secondary/10 py-8"
              >
                <h2
                  id="contact-title"
                  className="m-0 font-outfit text-2xl font-semibold text-brand-secondary"
                >
                  Location & contact
                </h2>
                <p className="mt-1.5 mb-6 font-poppins text-body text-ink/60">
                  Add details supporters can use to find or contact your
                  organization.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {textField("website", "Website")}
                  {textField("contactEmail", "Public contact email")}
                  {textField("city", "City", {
                    required: true,
                    leadingIcon: FiMapPin,
                  })}
                  {textField("state", "State or region")}
                  <div className="sm:col-span-2">
                    {textField("address", "Street address", {
                      multiline: true,
                    })}
                  </div>
                </div>
                <div className="mt-6 max-w-lg border-t border-brand-secondary/10 pt-5">
                  {textField("contactPhone", "Private organization phone")}
                  <p className="mt-1.5 mb-0 font-outfit text-caption text-ink/55">
                    Only visible to your organization account.
                  </p>
                </div>
              </section>

              <section
                id="organization-social"
                aria-labelledby="social-title"
                className="scroll-mt-28 py-8"
              >
                <h2
                  id="social-title"
                  className="m-0 font-outfit text-2xl font-semibold text-brand-secondary"
                >
                  Social profiles
                </h2>
                <p className="mt-1.5 mb-6 font-poppins text-body text-ink/60">
                  Add links where people can follow your work. Leave one blank
                  to remove it.
                </p>
                <div className="grid gap-5 sm:grid-cols-2">
                  {SOCIAL_FIELDS.map(({ field, label, Icon }) => (
                    <div key={field} className="min-w-0">
                      {textField(field, label, { leadingIcon: Icon })}
                    </div>
                  ))}
                </div>
              </section>

              <div className="border-t border-brand-secondary/10 py-5">
                <p className="m-0 font-outfit text-caption leading-5 text-ink/60">
                  Logo and cover uploads are not available yet. Image editing
                  needs managed storage first.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-brand-secondary/10 pt-5 sm:flex-row sm:justify-end">
                <Link
                  to={`/organization/${organization.handle}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-brand/25 bg-white px-6 py-3 font-outfit text-body font-medium text-brand no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                  isLoading={saving}
                  disabled={saving}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-none bg-brand px-6 py-3 font-outfit text-body font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Save changes
                </Button>
              </div>
            </form>
          </div>

          <aside className="hidden xl:sticky xl:top-24 xl:col-start-3 xl:block">
            <OrganizationProfilePreview form={form} />
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default OrganizationProfileEditor;
