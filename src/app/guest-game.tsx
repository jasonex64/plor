"use client";

// A game for a visitor with no account: the bare game and a way to sign in, nothing else (docs/milestones/M18-guest-play.md,
// Design, "What a guest can reach"). Its Start runs Cloudflare's bot check first and starts the run with the token it yields
// (Design, "The bot check"; answers 8 and 16). Cloudflare's explicit rendering ("Explicit rendering gives you programmatic
// control over when and where the widget appears.", developers.cloudflare.com/turnstile/get-started/client-side-rendering/):
// the script is loaded with render=explicit, and `execution: "execute"` means "The challenge runs after calling the
// `turnstile.execute()` function separately" and `appearance: "interaction-only"` that "The widget becomes visible only when
// visitor interaction is required" (.../widget-configurations/), so nothing is fetched on page load and a box shows only when
// Cloudflare wants one. The script is loaded here with next/script, "Layout Scripts": it loads only when this page is opened
// (node_modules/next/dist/docs/01-app/02-guides/scripts.md); onReady runs "after the script's load event ... and then after
// every subsequent component re-mount" and onError "when a script fails to load" (docs/01-app/03-api-reference/02-components/script.md).
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { BACK } from "./slide";
import { ButtonLink } from "./button-link";
import { Game } from "./game";
import { SubstringsScreen } from "./substrings";
import styles from "./offbeat.module.css";
import { GAME } from "@/platform/game";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
const turnstile = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Pending = { resolve: (token: string) => void; reject: (error: ApiError) => void };

// game: which of the two games this page plays; the widget and the way back to sign-in are the same.
export function GuestGame({ siteKey, game }: { siteKey: string; game: "offbeat" | "substrings" }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const pending = useRef<Pending | null>(null);
  const [playing, setPlaying] = useState(false);
  const [gameDay, setGameDay] = useState(0);
  // The script's own failure to load is shown as the check being unavailable, when Start is next pressed.
  const failed = useRef(false);

  // Each start attempt uses a fresh token: the widget is reset as each attempt ends, pass or fail.
  const settle = useCallback((end: (p: Pending) => void) => {
    const attempt = pending.current;
    if (!attempt) return;
    pending.current = null;
    turnstile()!.reset(widget.current!);
    end(attempt);
  }, []);

  const ready = useCallback(() => {
    if (widget.current !== null || !container.current) return;
    widget.current = turnstile()!.render(container.current, {
      sitekey: siteKey,
      execution: "execute",
      appearance: "interaction-only",
      callback: (token: string) => settle((p) => p.resolve(token)),
      "error-callback": () => settle((p) => p.reject(new ApiError("captcha_failed", 0))),
      "timeout-callback": () => settle((p) => p.reject(new ApiError("captcha_failed", 0))),
    });
  }, [siteKey, settle]);

  useEffect(() => {
    const mounted = container.current;
    return () => {
      if (widget.current !== null && mounted) turnstile()?.remove(widget.current);
      widget.current = null;
    };
  }, []);

  const botCheck = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        if (widget.current === null || failed.current) return reject(new ApiError("captcha_unavailable", 0));
        pending.current = { resolve, reject };
        turnstile()!.execute(widget.current);
      }),
    [],
  );

  const nextDay = useCallback((inPlay: boolean) => {
    if (!inPlay) setGameDay((d) => d + 1);
  }, []);

  return (
    <div className={styles.screen}>
      <Script src={SCRIPT} strategy="afterInteractive" onReady={ready} onError={() => (failed.current = true)} />
      <p className={styles.back} hidden={playing}>
        <ButtonLink href="/" transitionTypes={BACK}>
          Sign in
        </ButtonLink>
      </p>
      {game === "offbeat" ? (
        <section id="offbeat" aria-label={GAME.name} className={styles.game}>
          <Game key={`game-${gameDay}`} family="guest" botCheck={botCheck} onOver={() => {}} onDayOver={nextDay} onPlaying={setPlaying} />
        </section>
      ) : (
        <SubstringsScreen family="guest" botCheck={botCheck} onPlaying={setPlaying} />
      )}
      {/* Cloudflare draws its box here only when it needs the visitor (appearance: interaction-only). */}
      <div ref={container} />
    </div>
  );
}
