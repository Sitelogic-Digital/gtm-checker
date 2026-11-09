"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function Waitlist({ id = "waitlist" }: { id?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          buildLog: data.get("buildLog") === "on",
          company: data.get("company"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      setStatus("success");
      setMessage("You're on the list. Check your inbox for a confirmation.");
      form.reset();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <p role="status" className="rounded-[14px] border border-line bg-surface px-5 py-4 text-text">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate={false} className="w-full max-w-[560px]" aria-describedby={`${id}-note`}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`${id}-email`} className="sr-only">Email address</label>
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className="w-full rounded-[14px] border border-line bg-surface px-4 py-4 text-[17px] leading-tight text-text placeholder:text-text-2"
          />
        </div>
        {/* Honeypot: hidden from people and assistive tech */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor={`${id}-company`}>Company</label>
          <input id={`${id}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button type="submit" className="btn whitespace-nowrap" disabled={status === "loading"}>
          {status === "loading" ? "Joining…" : "Join the waiting list"}
        </button>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <input
          id={`${id}-log`}
          name="buildLog"
          type="checkbox"
          className="mt-[3px] h-5 w-5 shrink-0 cursor-pointer accent-[#2FBF71]"
        />
        <label htmlFor={`${id}-log`} className="cursor-pointer text-[15px] text-text-2">
          Send me the weekly build-log
        </label>
      </div>

      <p id={`${id}-note`} className="mt-4 text-[14px] leading-snug text-text-2">
        No spam. One email when we launch, and the weekly build-log if you want it.
        <br />
        We store your email and sign-up time to do that. <a className="underline" href="/privacy">Privacy</a>. Unsubscribe any time.
      </p>

      <p role="alert" aria-live="assertive" className="mt-3 min-h-[1.25rem] text-[14px] text-text">
        {status === "error" ? message : ""}
      </p>
    </form>
  );
}
