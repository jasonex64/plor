// The invite code's shape, shared by the server and the invite page (M07 D3). Base64url without padding writes
// every 3 bytes as 4 characters, rounded up.
import { INVITE_CODE_BYTES } from "@/config/tunables";

export const INVITE_CODE = new RegExp(`^[A-Za-z0-9_-]{${Math.ceil((INVITE_CODE_BYTES * 4) / 3)}}$`);
