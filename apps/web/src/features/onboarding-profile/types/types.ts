import type { Dispatch, SetStateAction } from "react";

export type ProfileCompletionErrors = Record<string, string>;

export type SetShowProfileModal = Dispatch<SetStateAction<boolean>>;
