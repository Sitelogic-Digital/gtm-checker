"use client";

import { useState } from "react";

export default function UnsubscribeForm({ email, token }: { email: string; token: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function go() {
    setState("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "done") return <p role="status">You’ve been removed. We won’t email {email} again.</p>;
  return (
    <div>
      <p className="text-text-2">Remove <strong className="text-text">{email}</strong> from the Lactiq waiting list?</p>
      <button type="button" className="btn mt-6" onClick={go} disabled={state === "loading"}>
        {state === "loading" ? "Removing…" : "Unsubscribe"}
      </button>
      <p role="alert" className="mt-3 text-[14px]">{state === "error" ? error : ""}</p>
    </div>
  );
}
