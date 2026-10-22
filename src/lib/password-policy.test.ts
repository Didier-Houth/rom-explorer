import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { isValidNewPassword } from "./password-policy";

describe("new password policy", () => {
  it("requires at least eight characters", () => {
    assert.equal(isValidNewPassword("Abcdef+"), false);
    assert.equal(isValidNewPassword("Abcdefg+"), true);
  });
  it("requires an uppercase letter", () => {
    assert.equal(isValidNewPassword("abcdefg+"), false);
    assert.equal(isValidNewPassword("Abcdefg+"), true);
    assert.equal(isValidNewPassword("Ébcdefg+"), true);
  });
  it("requires a special character, not just a digit or space", () => {
    assert.equal(isValidNewPassword("Abcdefg1"), false);
    assert.equal(isValidNewPassword("Abcdefg "), false);
    assert.equal(isValidNewPassword("Abcdefg!"), true);
  });
  it("accepts the algebraic operators + and *", () => {
    assert.equal(isValidNewPassword("Abcdefg+"), true);
    assert.equal(isValidNewPassword("Abcdefg*"), true);
  });
});