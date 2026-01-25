"use client";

import React, { useState, useEffect } from "react";
import { AuditReport, AuditIssue } from "@/lib/types";
import { AlertCircle, Trash2, Settings, Sparkles, Key, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { getAIFixRecommendation } from "@/lib/gemini";
import ReactMarkdown from "react-markdown";

interface IssuesListProps {
    report: AuditReport;
}

export default function IssuesList({ report }: IssuesListProps) {
    const { critical, cleanup, maintenance } = report.issues;
    const [apiKey, setApiKey] = useState("");
    const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);

    useEffect(() => {
        const savedKey = sessionStorage.getItem("gtm_gemini_api_key");
        if (savedKey) setApiKey(savedKey);
    }, []);

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const key = e.target.value;
        setApiKey(key);
        sessionStorage.setItem("gtm_gemini_api_key", key);
    };

    return (
        <div className="space-y-12">
            {/* AI Settings */}
            <div className="relative group overflow-hidden bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8 translate-y-[-24px] shadow-2xl shadow-black ring-1 ring-white/5 transition-all hover:border-brand/40">

                <div className="relative flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-brand p-2.5 rounded-xl shadow-[0_0_20px_rgba(255,89,90,0.3)]">
                            <Sparkles className="text-white animate-pulse" size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-black text-white uppercase tracking-wider text-xs">AI Deep-Dive Guidance</h4>
                                <span className="bg-brand/20 text-brand text-[8px] font-black px-1.5 py-0.5 rounded-md border border-brand/30">BETA</span>
                            </div>
                            <p className="text-zinc-400 text-[11px] mt-0.5 font-medium pr-12">
                                This is a beta feature. Please bring your own Gemini API Key to enable expert GTM fix recommendations.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsApiKeyVisible(!isApiKeyVisible)}
                        className="text-[10px] font-black uppercase tracking-widest text-brand hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10"
                    >
                        {isApiKeyVisible ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isApiKeyVisible ? "Minimize" : "Activate"}
                    </button>
                </div>

                {isApiKeyVisible && (
                    <div className="relative flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="relative flex-1">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input
                                type="password"
                                placeholder="Paste your Gemini API Key here..."
                                value={apiKey}
                                onChange={handleApiKeyChange}
                                className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs font-mono focus:border-brand outline-none transition-all placeholder:text-zinc-700"
                            />
                        </div>
                        <a
                            href="https://aistudio.google.com/app/apikey"
                            target="_blank"
                            className="text-[10px] font-bold text-brand hover:underline whitespace-nowrap bg-brand/5 px-4 py-3 rounded-xl border border-brand/20 transition-all hover:bg-brand/10"
                        >
                            Get Key →
                        </a>
                    </div>
                )}
            </div>

            {/* Critical */}
            {critical.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500/20 p-2 rounded-lg">
                            <AlertCircle className="text-red-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Critical Issues</h3>
                            <p className="text-zinc-500 text-sm">Address these immediately to prevent data loss or inaccuracies.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {critical.map((issue) => (
                            <IssueCard key={issue.id} issue={issue} color="red" apiKey={apiKey} />
                        ))}
                    </div>
                </section>
            )}

            {/* Cleanup */}
            {cleanup.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500/20 p-2 rounded-lg">
                            <Trash2 className="text-yellow-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Cleanup Opportunities</h3>
                            <p className="text-zinc-500 text-sm">Recommended actions to improve container performance and clarity.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cleanup.map((issue) => (
                            <IssueCard key={issue.id} issue={issue} color="yellow" apiKey={apiKey} />
                        ))}
                    </div>
                </section>
            )}

            {/* Maintenance */}
            {maintenance.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                            <Settings className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white uppercase tracking-wider">Maintenance Notes</h3>
                            <p className="text-zinc-500 text-sm">General observations and long-term maintenance items.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {maintenance.map((issue) => (
                            <IssueCard key={issue.id} issue={issue} color="blue" apiKey={apiKey} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function IssueCard({ issue, color, apiKey }: { issue: AuditIssue; color: "red" | "yellow" | "blue"; apiKey?: string }) {
    const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetAIHelp = async () => {
        if (!apiKey) {
            alert("Please enter your Gemini API Key in the settings above first.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const recommendation = await getAIFixRecommendation(apiKey, issue.title, issue.description, issue.affectedItems);
            setAiRecommendation(recommendation);
        } catch (err: any) {
            setError(err.message || "Failed to get AI recommendation.");
        } finally {
            setIsLoading(false);
        }
    };
    const colorMap = {
        red: "border-red-500/20 hover:border-red-500/40 bg-zinc-950",
        yellow: "border-yellow-500/20 hover:border-yellow-500/40 bg-zinc-950",
        blue: "border-blue-500/20 hover:border-blue-500/40 bg-zinc-950",
    };

    const textMap = {
        red: "text-red-500",
        yellow: "text-yellow-500",
        blue: "text-blue-500",
    };

    return (
        <div className={`p-6 rounded-2xl border ${colorMap[color]} transition-colors flex flex-col h-full`}>
            <h4 className="font-bold text-white text-lg mb-2">{issue.title}</h4>
            <p className="text-zinc-400 text-sm mb-4 flex-grow">{issue.description}</p>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className={`text-xs font-bold uppercase tracking-widest ${textMap[color]}`}>Recommendation</div>
                    <button
                        onClick={handleGetAIHelp}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isLoading
                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            : 'bg-brand/10 text-brand hover:bg-brand hover:text-white'
                            }`}
                    >
                        {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {aiRecommendation ? "Refine Guidance" : "AI Fix Guide"}
                    </button>
                </div>

                {aiRecommendation ? (
                    <div className="bg-zinc-950 p-4 rounded-xl border border-brand/20 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 text-brand mb-3">
                            <Sparkles size={14} />
                            <span className="text-[10px] font-black uppercase tracking-tighter">AI Deep Dive Recommendation</span>
                        </div>
                        <div className="prose prose-invert prose-xs max-w-none text-zinc-300 text-sm leading-relaxed">
                            <ReactMarkdown>{aiRecommendation}</ReactMarkdown>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-zinc-300 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                        {issue.recommendation}
                    </p>
                )}

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold">
                        {error}
                    </div>
                )}

                {issue.affectedItems.length > 0 && !aiRecommendation && (
                    <div className="space-y-2">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Affected Items</div>
                        <div className="flex flex-wrap gap-1">
                            {issue.affectedItems.slice(0, 5).map((item, i) => (
                                <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                                    {item}
                                </span>
                            ))}
                            {issue.affectedItems.length > 5 && (
                                <span className="text-[10px] text-zinc-500 ml-1">+{issue.affectedItems.length - 5} more</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
