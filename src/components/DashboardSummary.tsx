"use client";

import React from "react";
import { motion } from "framer-motion";
import { Tag, Zap, Database, Activity } from "lucide-react";
import { AuditReport } from "@/lib/types";

interface DashboardSummaryProps {
    report: AuditReport;
}

export default function DashboardSummary({ report }: DashboardSummaryProps) {
    const { metrics, containerId, versionId } = report;
    const score = metrics.healthScore;

    const getScoreColor = (s: number) => {
        if (s >= 90) return "text-emerald-500";
        if (s >= 70) return "text-yellow-500";
        if (s >= 50) return "text-orange-500";
        return "text-red-500";
    };

    const getScoreLabel = (s: number) => {
        if (s >= 90) return "Excellent";
        if (s >= 70) return "Good";
        if (s >= 50) return "Needs Attention";
        return "Critical";
    };

    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Card */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-12 shadow-2xl shadow-black">
                    <div className="relative w-48 h-48">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="70"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="12"
                                className="text-zinc-800"
                            />
                            <motion.circle
                                cx="96"
                                cy="96"
                                r="70"
                                fill="transparent"
                                stroke="currentColor"
                                strokeWidth="12"
                                strokeDasharray={2 * Math.PI * 70}
                                initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                                animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - score / 100) }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={getScoreColor(score)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-5xl font-black ${getScoreColor(score)}`}>
                                {score}
                            </span>
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
                                Score
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <h2 className="text-4xl font-black text-white mb-2 leading-tight">
                                Container Health Check
                            </h2>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <span className="bg-black text-zinc-400 px-3 py-1 rounded-lg text-xs font-bold border border-zinc-800">
                                    {containerId}
                                </span>
                                <span className="bg-black text-zinc-400 px-3 py-1 rounded-lg text-xs font-bold border border-zinc-800">
                                    v{versionId}
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-800/50">
                            <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                                <Activity className={`${getScoreColor(score)} animate-pulse`} size={20} />
                                <span className={`text-xl font-bold ${getScoreColor(score)}`}>
                                    {getScoreLabel(score)}
                                </span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed max-w-md text-sm">
                                Your container score is {score}/100 based on tag status, legacy elements, and maintenance history.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 gap-4">
                    <StatCard icon={<Tag className="text-brand" />} label="Total Tags" value={metrics.totalTags} />
                    <StatCard icon={<Zap className="text-blue-500" />} label="Triggers" value={metrics.totalTriggers} />
                    <StatCard icon={<Database className="text-purple-500" />} label="Variables" value={metrics.totalVariables} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between group hover:border-brand/30 transition-colors shadow-lg shadow-black">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-black rounded-xl group-hover:scale-110 transition-transform border border-zinc-800">
                    {icon}
                </div>
                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{label}</p>
                    <p className="text-3xl font-bold text-white leading-none mt-1">{value}</p>
                </div>
            </div>
            <Activity className="text-zinc-800 group-hover:text-zinc-700 transition-colors shrink-0" size={40} strokeWidth={1} />
        </div>
    );
}
