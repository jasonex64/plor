import { describe, expect, it } from "vitest";
import { TYPED_ANSWER_MAX_LENGTH } from "../config/tunables";
import { AppError } from "../lib/http";
import { assertTypedLength } from "./run-shared";

// Typed text is refused before it is matched (audit W1), and a NUL character is refused because Postgres text can't hold
// one (19b): both are a 400 with `text_invalid`.
describe("assertTypedLength", () => {
  const refusal = { code: "text_invalid", status: 400 };

  it("refuses text holding a NUL character", () => {
    expect(() => assertTypedLength("a\u0000b")).toThrow(expect.objectContaining(refusal));
  });

  it("refuses text one character over the limit", () => {
    expect(() => assertTypedLength("x".repeat(TYPED_ANSWER_MAX_LENGTH + 1))).toThrow(AppError);
    expect(() => assertTypedLength("x".repeat(TYPED_ANSWER_MAX_LENGTH + 1))).toThrow(expect.objectContaining(refusal));
  });

  it("accepts text of exactly the limit", () => {
    expect(() => assertTypedLength("x".repeat(TYPED_ANSWER_MAX_LENGTH))).not.toThrow();
  });
});
