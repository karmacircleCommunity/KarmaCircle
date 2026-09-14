import { FiPlus, FiTrash2 } from "react-icons/fi";
import type { LeadershipMember, OrganizationSetupForm } from "../../types";

const MAX_LEADERS = 8;

const fieldInput =
  "w-full rounded-lg border border-brand-secondary/15 bg-white px-3 py-2 font-poppins text-body text-ink outline-none transition-colors placeholder:text-ink/30 focus:border-brand";

/**
 * The one "list" question in the setup flow — a repeating card editor for
 * `leadership`, which doesn't fit any of the flow's other question kinds
 * (they all ask for a fixed, known set of fields; this one asks for an
 * unknown number of rows). Kept as its own component rather than a branch
 * inside `SetupQuestion.tsx` because add/remove/reorder state doesn't
 * belong in that file's otherwise-stateless render-by-kind switch.
 *
 * Mirrors the rest of the flow's save model: nothing here is required, and
 * the whole array is what `toStepPayload` sends — same "always send,
 * removing the last row is a real edit" treatment `domains` already gets.
 */
const SetupLeadershipEditor = ({
  form,
  setField,
}: {
  form: OrganizationSetupForm;
  setField: <K extends keyof OrganizationSetupForm>(
    key: K,
    value: OrganizationSetupForm[K],
  ) => void;
}) => {
  const leaders = form.leadership;

  const update = (index: number, patch: Partial<LeadershipMember>) => {
    setField(
      "leadership",
      leaders.map((leader, i) => (i === index ? { ...leader, ...patch } : leader)),
    );
  };

  const remove = (index: number) => {
    setField(
      "leadership",
      leaders.filter((_, i) => i !== index),
    );
  };

  const add = () => {
    if (leaders.length >= MAX_LEADERS) return;
    setField("leadership", [...leaders, { name: "", title: "" }]);
  };

  return (
    <div className="flex flex-col gap-4">
      {leaders.length === 0 && (
        <p className="font-poppins text-body text-ink/50">
          Nobody added yet — this is optional.
        </p>
      )}

      {leaders.map((leader, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-3 rounded-xl border border-brand-secondary/12 bg-surface-warm p-4 sm:grid-cols-2"
        >
          <input
            type="text"
            value={leader.name}
            onChange={(event) => update(index, { name: event.target.value })}
            placeholder="Name"
            maxLength={80}
            data-cy={`org-leader-${index}-name`}
            className={fieldInput}
          />
          <input
            type="text"
            value={leader.title}
            onChange={(event) => update(index, { title: event.target.value })}
            placeholder="Title, e.g. Founder"
            maxLength={80}
            data-cy={`org-leader-${index}-title`}
            className={fieldInput}
          />
          <input
            type="url"
            value={leader.photo ?? ""}
            onChange={(event) => update(index, { photo: event.target.value })}
            placeholder="Photo URL (optional)"
            className={`${fieldInput} sm:col-span-2`}
          />
          <textarea
            value={leader.bio ?? ""}
            onChange={(event) => update(index, { bio: event.target.value })}
            placeholder="Short bio (optional)"
            maxLength={300}
            rows={2}
            className={`${fieldInput} resize-none sm:col-span-2`}
          />
          <button
            type="button"
            onClick={() => remove(index)}
            className="inline-flex w-fit cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 font-outfit text-caption font-medium text-error sm:col-span-2"
          >
            <FiTrash2 aria-hidden="true" className="size-3.5" /> Remove
          </button>
        </div>
      ))}

      {leaders.length < MAX_LEADERS && (
        <button
          type="button"
          onClick={add}
          data-cy="org-leader-add"
          className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-brand/35 bg-transparent px-4 py-2 font-outfit text-body font-medium text-brand transition-colors duration-200 hover:bg-brand/8"
        >
          <FiPlus aria-hidden="true" /> Add a person
        </button>
      )}
    </div>
  );
};

export default SetupLeadershipEditor;
