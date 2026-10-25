"use client";

// Groups (docs/milestones/M10-groups.md, 10b; G1, G6, G7): the home page's Groups section, a group's page and its
// invite link. Every step goes through the API; errors are shown and never retried silently (DECISIONS.md: Error
// handling). The look is M14's.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api-client";
import { latestOnly } from "@/lib/latest";
import { PAUSED_TEXT, PAYLOAD_VERSION, changesThread, useBoardChannel } from "./board-channel";
import { Avatar } from "./avatar";
import { Comments } from "./comments";
import { Leaderboard } from "./leaderboard";
import { errorText } from "./messages";

type GroupSummary = { id: string; name: string };
type Member = { username: string; name: string; creator: boolean };
type Group = GroupSummary & { inviteCode: string; creator: boolean; members: Member[] };

// Runs one action at a time with its error shown, as the Friends section does.
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

// The player's groups, each linking to its page, and Create (G7).
export function Groups() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [name, setName] = useState("");
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    api<{ groups: GroupSummary[] }>("/api/groups", { method: "GET" }).then(
      (r) => setGroups(r.groups),
      (err) => setError(errorText(err)),
    );
  }, [setError]);

  const create = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const { group } = await api<{ group: GroupSummary }>("/api/groups/create", { method: "POST", body: { name } });
      router.push(`/groups/${group.id}`);
    });
  };

  return (
    <section aria-label="Groups">
      <h2>Groups</h2>
      {groups && groups.length === 0 && <p>No groups yet. Make one and send its link to your group chat.</p>}
      {groups && groups.length > 0 && (
        <ul>
          {groups.map((g) => (
            <li key={g.id}>
              <Link href={`/groups/${g.id}`}>{g.name}</Link>
            </li>
          ))}
        </ul>
      )}
      {!groups && !error && <p>Loading…</p>}
      <form onSubmit={create}>
        <label>
          New group&apos;s name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit" disabled={busy}>
          Create group
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

// A group's page: members, the invite link every member can share, the creator's powers (G1, G6), the group's weekly
// leaderboard (10c) and its thread, live (10d; G4, G5). username is the signed-in player's.
export function GroupPage({ id, username }: { id: string; username: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const { busy, error, setError, run } = useAction();
  // Counts nudges that this group's thread changed; the page has no game, so the thread opens once loaded after the
  // player's run is over.
  const [threadNudge, setThreadNudge] = useState(0);
  const nudgeThread = useCallback(() => setThreadNudge((n) => n + 1), []);
  const { paused } = useBoardChannel({
    joined: nudgeThread,
    changed: (message) => {
      if (message.v !== PAYLOAD_VERSION) console.error("board message with unknown version", message.v);
      if (changesThread(message, { group: id })) nudgeThread();
    },
    failed: (err) => setError(errorText(err)),
  });

  // A reload after a removal can overlap the first load: only the newest answer is shown (M11 H6).
  const [latest] = useState(latestOnly);
  // The time to the reset, from the last load, and a count of resets: the thread and the board start again at midnight
  // Pacific, from the server's new day (M11 H6).
  const [msToReset, setMsToReset] = useState<number | null>(null);
  const [day, setDay] = useState(0);
  function load() {
    latest(
      api<{ group: Group; msToReset: number }>(`/api/groups/detail?id=${encodeURIComponent(id)}`, { method: "GET" }),
      (r) => {
        setGroup(r.group);
        setDraft(r.group.name);
        setMsToReset(r.msToReset);
      },
      (err) => setError(errorText(err)),
    );
  }
  useEffect(load, [id, setError, latest, day]);
  useEffect(() => {
    if (msToReset === null) return;
    const timer = setTimeout(() => setDay((d) => d + 1), msToReset);
    return () => clearTimeout(timer);
  }, [msToReset]);

  const act = (action: () => Promise<void>) => {
    setCopied(false);
    void run(action);
  };
  const rename = (event: FormEvent) => {
    event.preventDefault();
    act(async () => {
      const r = await api<{ name: string }>("/api/groups/rename", { method: "POST", body: { id, name: draft } });
      setGroup((g) => g && { ...g, name: r.name });
    });
  };
  const resetLink = () =>
    act(async () => {
      const { inviteCode } = await api<{ inviteCode: string }>("/api/groups/invite", { method: "POST", body: { id } });
      setGroup((g) => g && { ...g, inviteCode });
    });
  // Leaving or removing deletes that member's comments in the group (G6), so both ask first, like Delete
  // (docs/milestones/M12-12f-review-fixes.md, F3).
  const removeMember = (member: Member) => {
    if (!window.confirm(`Remove ${member.name} from ${group?.name}? Their comments in it are deleted.`)) return;
    act(async () => {
      await api("/api/groups/remove", { method: "POST", body: { id, username: member.username } });
      load();
    });
  };
  const leave = () => {
    if (!window.confirm(`Leave ${group?.name}? Your comments in it are deleted.`)) return;
    act(async () => {
      await api("/api/groups/leave", { method: "POST", body: { id } });
      router.push("/");
    });
  };
  const deleteGroup = () => {
    if (!window.confirm(`Delete ${group?.name} for everyone in it?`)) return;
    act(async () => {
      await api("/api/groups/delete", { method: "POST", body: { id } });
      router.push("/");
    });
  };

  const link = group ? `${window.location.origin}/groups/join/${group.inviteCode}` : null;
  return (
    <>
      <section aria-label="Group">
        {paused && <p role="status">{PAUSED_TEXT}</p>}
        {group && link && (
          <>
            <h2>{group.name}</h2>
            {group.creator && (
              <form onSubmit={rename}>
                <label>
                  Group name
                  <input value={draft} onChange={(e) => setDraft(e.target.value)} />
                </label>
                <button type="submit" disabled={busy}>
                  Rename
                </button>
              </form>
            )}
            <h3>Members</h3>
            <ul>
              {group.members.map((m) => (
                <li key={m.username}>
                  <Avatar name={m.name} /> {m.name}
                  {m.creator && " (creator)"}
                  {group.creator && !m.creator && (
                    <>
                      {" "}
                      <button type="button" disabled={busy} onClick={() => removeMember(m)}>
                        Remove
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p>
              Invite link: <code>{link}</code>{" "}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  })
                }
              >
                Copy
              </button>
              {group.creator && (
                <>
                  {" "}
                  <button type="button" disabled={busy} onClick={resetLink}>
                    Reset link
                  </button>
                </>
              )}
              {copied && " Copied."}
            </p>
            <button type="button" disabled={busy} onClick={leave}>
              Leave group
            </button>
            {group.creator && (
              <>
                {" "}
                <button type="button" disabled={busy} onClick={deleteGroup}>
                  Delete group
                </button>
              </>
            )}
          </>
        )}
        {!group && !error && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
        <p>
          <Link href="/">Go to today&apos;s puzzle</Link>
        </p>
      </section>
      {/* Shown once the page proves membership, and reloaded when the members change (a removal). */}
      {group && (
        <Leaderboard
          key={`${day} ${group.members.map((m) => m.username).join(" ")}`}
          title="Group leaderboard"
          path={`/api/groups/leaderboard?id=${encodeURIComponent(id)}`}
        />
      )}
      {group && <Comments key={day} username={username} runOver={false} nudge={threadNudge} group={id} />}
    </>
  );
}

// What a group's invite link opens, once signed in with a username (G7).
export function JoinGroup({ code }: { code: string }) {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const { busy, error, setError, run } = useAction();

  useEffect(() => {
    api<{ group: { name: string } }>(`/api/groups/preview?code=${encodeURIComponent(code)}`, { method: "GET" }).then(
      (r) => setName(r.group.name),
      (err) => setError(errorText(err)),
    );
  }, [code, setError]);

  const join = () =>
    void run(async () => {
      const { group } = await api<{ group: GroupSummary }>("/api/groups/join", { method: "POST", body: { code } });
      router.push(`/groups/${group.id}`);
    });

  return (
    <section aria-label="Join group">
      {name && (
        <>
          <h2>Join {name}?</h2>
          <button type="button" disabled={busy} onClick={join}>
            Join group
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <p>
        <Link href="/">Go to today&apos;s puzzle</Link>
      </p>
    </section>
  );
}
