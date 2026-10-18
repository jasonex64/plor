// One JSON object per line. Vercel infers the level from the console method, not the JSON body,
// so each level must use its matching method (DECISIONS.md: Logging; Vercel runtime logs docs).
type Fields = Record<string, unknown>;

function line(level: string, msg: string, fields?: Fields): string {
  return JSON.stringify({ level, msg, time: new Date().toISOString(), ...fields });
}

export const log = {
  info: (msg: string, fields?: Fields) => console.log(line("info", msg, fields)),
  warn: (msg: string, fields?: Fields) => console.warn(line("warn", msg, fields)),
  error: (msg: string, fields?: Fields) => console.error(line("error", msg, fields)),
};
