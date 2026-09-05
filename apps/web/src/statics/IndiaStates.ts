/**
 * India's 36 states and union territories, alphabetical.
 *
 * Kept eager (a few hundred bytes) while the city list next door is
 * dynamically imported: the state field can suggest from the first
 * keystroke without waiting on a chunk, and the same array is what
 * decodes the city rows' state index.
 *
 * Source: the open countries-states-cities database
 * (github.com/dr5hn/countries-states-cities-database), regenerated rather
 * than hand-edited - see IndiaCities.ts for the note on how.
 */
export const INDIA_STATES: readonly string[] = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];
