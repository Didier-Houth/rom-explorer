import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readRememberedEmail, rememberEmail } from "./remembered-email";

test("email is reused after registration without storing the password", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(readRememberedEmail(storage), "");
  rememberEmail(storage, " contributor@example.org ");
  assert.equal(readRememberedEmail(storage), "contributor@example.org");
  assert.deepEqual([...values.values()], ["contributor@example.org"]);
});

test("unavailable email storage never blocks sign-in", () => {
  const storage = { getItem: (): string | null => { throw new Error("Unavailable"); }, setItem: () => { throw new Error("Unavailable"); } };
  assert.equal(readRememberedEmail(storage), "");
  assert.equal(rememberEmail(storage, "contributor@example.org"), "contributor@example.org");
});