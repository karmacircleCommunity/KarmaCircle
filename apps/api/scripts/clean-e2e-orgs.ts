/**
 * Removes organizations (and their login documents) left behind by
 * `apps/web/e2e/organizations/organization-setup.spec.ts` when it runs
 * against a real dev database instead of the isolated in-memory e2e
 * server (`E2E_API_URL` pointed at `apps/api` directly, or the spec run
 * outside its normal harness). That test generates a fresh org per run
 * named `Riverbank Relief <SUFFIX>`, where `<SUFFIX>` is a run's
 * `Date.now()` timestamp with each digit mapped through `"ABCDEFGHIJ"`
 * (see the spec's own `suffix` constant) — a distinctive, unmistakably
 * test-generated pattern, not a real organization name.
 *
 * Read-only by default: prints what it *would* delete. Pass --force to
 * actually delete.
 *
 * Usage:
 *   npx tsx scripts/clean-e2e-orgs.ts            # dry run
 *   npx tsx scripts/clean-e2e-orgs.ts --force    # actually delete
 */
import "dotenv/config";
import mongoose from "mongoose";
import { Organization as OrganizationLogin } from "../src/modules/users/user.model";
import { Organization as OrganizationRecord } from "../src/modules/organizations/organization.model";

const MONGO_URI = process.env.MONGO_URI;

// Exactly the shape organization-setup.spec.ts's `suffix` constant
// produces: "Riverbank Relief " followed only by the ten letters that
// digit-to-letter mapping can ever emit.
const RIVERBANK_PATTERN = /^Riverbank Relief [A-J]+$/;

async function main() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not set (check apps/api/.env)");
  }

  const force = process.argv.includes("--force");

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${mongoose.connection.name}`);

  const matches = await OrganizationRecord.find({
    name: RIVERBANK_PATTERN,
  }).select("handle name ownerEmail createdAt");

  if (matches.length === 0) {
    console.log("Nothing matches the e2e fixture pattern. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${matches.length} test-generated organization(s):`);
  for (const org of matches) {
    console.log(`  - ${org.name}  (handle: ${org.handle}, owner: ${org.ownerEmail})`);
  }

  if (!force) {
    console.log("\nDry run only — nothing deleted. Re-run with --force to delete these.");
    await mongoose.disconnect();
    return;
  }

  const handles = matches.map((org) => org.handle);
  const ownerEmails = matches.map((org) => org.ownerEmail);

  const [recordResult, loginResult] = await Promise.all([
    OrganizationRecord.deleteMany({ handle: { $in: handles } }),
    OrganizationLogin.deleteMany({ email: { $in: ownerEmails } }),
  ]);

  console.log(
    `Deleted ${recordResult.deletedCount} organization record(s) and ${loginResult.deletedCount} login document(s).`,
  );

  await mongoose.disconnect();
  console.log("Done. Disconnected.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
