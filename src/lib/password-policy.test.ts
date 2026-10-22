import { describe, expect, it } from "vitest";
import { isValidNewPassword } from "./password-policy";

describe("new password policy", () => {
  it("requires at least eight characters", () => {
    expect(isValidNewPassword("Abcdef+")).toBe(false);
    expect(isValidNewPassword("Abcdefg+")).toBe(true);
  });
  it("requires an uppercase letter", () => {
    expect(isValidNewPassword("abcdefg+")).toBe(false);
    expect(isValidNewPassword("Abcdefg+")).toBe(true);
    expect(isValidNewPassword("Ébcdefg+")).toBe(true);
  });
  it("requires a special character, not just a digit or space", () => {
    expect(isValidNewPassword("Abcdefg1")).toBe(false);
    expect(isValidNewPassword("Abcdefg ")).toBe(false);
    expect(isValidNewPassword("Abcdefg!")).toBe(true);
  });
  it("accepts the algebraic operators + and *", () => {
    expect(isValidNewPassword("Abcdefg+")).toBe(true);
    expect(isValidNewPassword("Abcdefg*")).toBe(true);
  });
});