import { test } from "node:test";
import { strict as assert } from "node:assert";
import { contributorPrefix, canSelectContributor, contributorGroupId, parseContributorGroup } from "./contributors";

test("identifier prefix uses two first-name and four surname letters", () => {
  assert.equal(contributorPrefix("Didier", "Houth"), "DIHOUT");
  assert.equal(contributorPrefix("Élodie", "Dùpont"), "ELDUPO");
});
test("only the signed-in person's identifier may be selected", () => {
  assert.equal(canSelectContributor("DIHOUT000001", "DIHOUT000001"), true);
  assert.equal(canSelectContributor("DIHOUT000002", "DIHOUT000001"), false);
});
test("validated and archived group links preserve the first identifier reference", () => {
  assert.deepEqual(parseContributorGroup(contributorGroupId("DIHOUT000001")), { identifier: "DIHOUT000001", archived: false });
  assert.deepEqual(parseContributorGroup(contributorGroupId("DIHOUT000001", true)), { identifier: "DIHOUT000001", archived: true });
});