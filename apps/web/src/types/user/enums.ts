/** The two account kinds the backend recognizes. Mirrors the string values
 * `src/statics/Constants.ts`'s `authTypeOptions` already used at runtime;
 * this enum gives that same value a real type instead of a bare string. */
export enum UserType {
  Individual = "individual",
  Club = "club",
}
