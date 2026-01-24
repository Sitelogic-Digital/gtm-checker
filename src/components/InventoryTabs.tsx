"use client";

import React, { useState } from "react";
import { AuditReport, TagInventoryItem, TriggerInventoryItem, VariableInventoryItem } from "@/lib/types";
import { Search, Filter, AlertTriangle, CheckCircle2, Pause, Clock, Tag as TagIcon, Zap, Database } from "lucide-react";

interface InventoryTabsProps {
    report: AuditReport;
}

export default function InventoryTabs({ report }: InventoryTabsProps) {
    const [activeTab, setActiveTab] = useState<"tags" | "triggers" | "variables">("tags");

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-2">
                <div className="flex gap-8">
                    <TabButton
                        active={activeTab === "tags"}
                        onClick={() => setActiveTab("tags")}
                        label="Tags"
                        count={report.tags.length}
                        icon={<TagIcon size={18} />}
                    />
                    <TabButton
                        active={activeTab === "triggers"}
                        onClick={() => setActiveTab("triggers")}
                        label="Triggers"
                        count={report.triggers.length}
                        icon={<Zap size={18} />}
                    />
                    <TabButton
                        active={activeTab === "variables"}
                        onClick={() => setActiveTab("variables")}
                        label="Variables"
                        count={report.variables.length}
                        icon={<Database size={18} />}
                    />
                </div>
            </div>

            <div className="overflow-hidden">
                {activeTab === "tags" && <TagsTable data={report.tags} />}
                {activeTab === "triggers" && <TriggersTable data={report.triggers} />}
                {activeTab === "variables" && <VariablesTable data={report.variables} />}
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label, count, icon }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 pb-4 px-1 transition-all relative font-bold text-sm uppercase tracking-wider ${active ? "text-brand" : "text-zinc-500 hover:text-white"
                }`}
        >
            {icon}
            {label}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${active ? 'bg-brand/20 text-brand' : 'bg-zinc-800 text-zinc-500'}`}>
                {count}
            </span>
            {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
        </button>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: any = {
        Active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Paused: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        Blocked: "bg-red-500/10 text-red-500 border-red-500/20",
        "In Use": "bg-blue-500/10 text-blue-400 border-blue-500/20",
        Unused: "bg-zinc-800 text-zinc-500 border-zinc-700",
    };

    return (
        <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-black border tracking-wider ${colors[status] || colors.Unused}`}>
            {status}
        </span>
    );
}

function IssuesList({ issues }: { issues: string[] }) {
    if (issues.length === 0) return <span className="text-emerald-500 text-xs">✅ OK</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {issues.map(issue => {
                let color = "bg-zinc-800 text-zinc-400";
                if (issue.includes("Legacy") || issue.includes("Unused")) color = "bg-red-500/20 text-red-400 border border-red-500/20";
                if (issue.includes("Pause")) color = "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20";
                if (issue.includes("Old")) color = "bg-zinc-800 text-zinc-400 border border-zinc-700";

                return (
                    <span key={issue} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
                        {issue}
                    </span>
                );
            })}
        </div>
    );
}

function TagsTable({ data }: { data: TagInventoryItem[] }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 shadow-xl shadow-black">
            <table className="w-full text-left border-collapse bg-zinc-900">
                <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-widest font-bold">
                        <th className="px-6 py-4">Tag Name</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Fires On</th>
                        <th className="px-6 py-4">Modified</th>
                        <th className="px-6 py-4">Issues</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {data.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="px-6 py-4">
                                <p className="text-sm font-bold text-white group-hover:text-brand transition-colors">{item.name}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs text-zinc-400">{item.friendlyType}</span>
                            </td>
                            <td className="px-6 py-4">
                                <StatusBadge status={item.status} />
                            </td>
                            <td className="px-6 py-4 max-w-[200px]">
                                <div className="flex flex-wrap gap-1">
                                    {item.firesOn.map((f, i) => (
                                        <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{f}</span>
                                    ))}
                                    {item.firesOn.length === 0 && <span className="text-[10px] text-zinc-600">None</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="text-xs text-white">{item.lastModified}</span>
                                    <span className={`text-[10px] ${item.ageDays > 365 ? 'text-yellow-500' : 'text-zinc-500'}`}>
                                        {item.ageDays} days {item.ageDays > 365 ? '⚠️' : ''}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <IssuesList issues={item.issues} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TriggersTable({ data }: { data: TriggerInventoryItem[] }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 shadow-xl shadow-black">
            <table className="w-full text-left border-collapse bg-zinc-900">
                <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-widest font-bold">
                        <th className="px-6 py-4">Trigger Name</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Used By</th>
                        <th className="px-6 py-4">Modified</th>
                        <th className="px-6 py-4">Issues</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {data.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="px-6 py-4">
                                <p className="text-sm font-bold text-white group-hover:text-brand transition-colors">{item.name}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs text-zinc-400">{item.friendlyType}</span>
                            </td>
                            <td className="px-6 py-4">
                                <StatusBadge status={item.status} />
                            </td>
                            <td className="px-6 py-4 max-w-[200px]">
                                <span className="text-xs text-zinc-500">{item.usedBy.length} items</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="text-xs text-white">{item.lastModified}</span>
                                    <span className="text-[10px] text-zinc-500">{item.ageDays} days</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <IssuesList issues={item.issues} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function VariablesTable({ data }: { data: VariableInventoryItem[] }) {
    return (
        <div className="overflow-x-auto rounded-2xl border border-zinc-800 shadow-xl shadow-black">
            <table className="w-full text-left border-collapse bg-zinc-900">
                <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-widest font-bold">
                        <th className="px-6 py-4">Variable Name</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">References</th>
                        <th className="px-6 py-4">Modified</th>
                        <th className="px-6 py-4">Issues</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                    {data.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30 transition-colors group">
                            <td className="px-6 py-4">
                                <p className="text-sm font-bold text-white group-hover:text-brand transition-colors">{item.name}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs text-zinc-400">{item.friendlyType}</span>
                            </td>
                            <td className="px-6 py-4">
                                <StatusBadge status={item.status} />
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs text-zinc-500">{item.usedBy.length} items</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col">
                                    <span className="text-xs text-white">{item.lastModified}</span>
                                    <span className="text-[10px] text-zinc-500">{item.ageDays} days</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <IssuesList issues={item.issues} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
