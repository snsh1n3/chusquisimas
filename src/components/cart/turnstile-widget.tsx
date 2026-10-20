"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

/**
 * Widget de Cloudflare Turnstile en modo explícito. El token es de un solo
 * uso: tras un envío fallido hay que llamar a reset() para obtener otro.
 */
interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptPromise = null; reject(new Error("turnstile_script_failed")); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  reset(): void;
}

export function TurnstileWidget({ siteKey, onToken, onError, ref }: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError: () => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callbacks = useRef({ onToken, onError });

  useEffect(() => {
    callbacks.current = { onToken, onError };
  });

  useImperativeHandle(ref, () => ({
    reset() {
      callbacks.current.onToken(null);
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !container.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: "order",
        language: "es",
        theme: "light",
        callback: (token: string) => callbacks.current.onToken(token),
        "expired-callback": () => callbacks.current.onToken(null),
        "error-callback": () => { callbacks.current.onToken(null); callbacks.current.onError(); },
      });
    }).catch(() => callbacks.current.onError());
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  return <div ref={container} className="min-h-16" />;
}
