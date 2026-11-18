// The HTTP status codes the app answers with, named once (docs/milestones/PROCESS-lint-rules.md, answer 15).
// Names and numbers from RFC 9110, section 15 (https://www.rfc-editor.org/rfc/rfc9110.html), and 429 from RFC 6585,
// section 4 (https://www.rfc-editor.org/rfc/rfc6585.html). No imports, so client code can use it too.
export const STATUS = {
  ok: 200, // RFC 9110 15.3.1
  created: 201, // RFC 9110 15.3.2
  temporaryRedirect: 307, // RFC 9110 15.4.8
  badRequest: 400, // RFC 9110 15.5.1
  unauthorized: 401, // RFC 9110 15.5.2
  forbidden: 403, // RFC 9110 15.5.4
  notFound: 404, // RFC 9110 15.5.5
  conflict: 409, // RFC 9110 15.5.10
  unprocessableContent: 422, // RFC 9110 15.5.21
  tooManyRequests: 429, // RFC 6585 4
  internalServerError: 500, // RFC 9110 15.6.1
  serviceUnavailable: 503, // RFC 9110 15.6.4
} as const;
