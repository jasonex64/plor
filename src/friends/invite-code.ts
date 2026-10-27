// The invite code's shape, shared by the server and the invite pages (M07 D3; M14 14b-3).
import { INVITE_CODE_LENGTH } from "@/config/tunables";

export const INVITE_CODE = new RegExp(`^[A-Za-z0-9_-]{${INVITE_CODE_LENGTH}}$`);
