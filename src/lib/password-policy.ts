export const PASSWORD_REQUIREMENTS = "Au moins 8 caractères, une majuscule et un caractère spécial (dont + ou *).";

export function isValidNewPassword(password: string): boolean {
  return Array.from(password).length >= 8 && /\p{Lu}/u.test(password) && /[^\p{L}\p{N}\s]/u.test(password);
}