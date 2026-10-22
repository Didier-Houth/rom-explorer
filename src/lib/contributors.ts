export type Contributor = { id: string; identifier: string; first_name: string; last_name: string };

export function contributorLetters(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}

export function contributorPrefix(firstName: string, lastName: string) {
  return contributorLetters(firstName).slice(0, 2) + contributorLetters(lastName).slice(0, 4);
}

export function canSelectContributor(selectedIdentifier: string, ownIdentifier: string) {
  return selectedIdentifier === ownIdentifier;
}

export function contributorGroupId(identifier: string, archived = false) {
  return `${archived ? "archivees" : "validees"}--${identifier}`;
}

export function parseContributorGroup(id: string) {
  const match = /^(validees|archivees)--([A-Z]{6}\d{6})$/.exec(id);
  const identifier = match?.[2];
  return match && identifier ? { identifier, archived: match[1] === "archivees" } : null;
}