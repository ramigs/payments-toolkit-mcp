export const CARD_NETWORKS: Array<{
  name: string;
  prefixRanges: string[];
  match: RegExp;
}> = [
  { name: "Visa", prefixRanges: ["4"], match: /^4/ },
  {
    name: "Mastercard",
    prefixRanges: ["51-55", "2221-2720"],
    match: /^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/,
  },
  { name: "American Express", prefixRanges: ["34", "37"], match: /^3[47]/ },
  {
    name: "Discover",
    prefixRanges: ["6011", "644-649", "65"],
    match: /^(6011|64[4-9]|65)/,
  },
  {
    name: "Diners Club",
    prefixRanges: ["300-305", "36", "38"],
    match: /^(30[0-5]|36|38)/,
  },
  { name: "JCB", prefixRanges: ["3528-3589"], match: /^35(2[89]|[3-8]\d)/ },
];

export function detectCardType(cardNumber: string): string {
  const network = CARD_NETWORKS.find((n) => n.match.test(cardNumber));
  return network?.name ?? "unknown";
}
