import data from "./sample.json"

export function filterByName(text: string) {
  return data.filter(item => {
    return item.name.toLowerCase().includes(text.toLowerCase());
  });
}

export function getByExternalId(externalId: string) {
  return data.find(item => item.externalId === externalId);
}

