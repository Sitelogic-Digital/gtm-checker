"use client";

import React from "react";
import { Settings, Download, MousePointer2, FileJson, ChevronRight } from "lucide-react";

export default function GTMExportGuide() {
    const steps = [
        {
            title: "Go to Admin",
            desc: "Click 'Admin' in the top navigation of your GTM account.",
            icon: <Settings size={18} />,
        },
        {
            title: "Export Container",
            desc: "Select 'Export Container' from the Container column.",
            icon: <MousePointer2 size={18} />,
        },
        {
            title: "Download JSON",
            desc: "Choose a version and click the Download button.",
            icon: <Download size={18} />,
        }
    ];

    return (
        <div id="instructions" className="w-full max-w-4xl mx-auto mt-12 bg-zinc-900/40 border border-white/5 rounded-3xl p-8 scroll-mt-24">
            <div className="flex flex-col items-center gap-3 mb-10 text-center">
                <div className="bg-brand/10 p-2 rounded-lg text-brand">
                    <FileJson size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">How to get your container file</h3>
                    <p className="text-zinc-500 text-xs font-medium">Follow these 3 simple steps in Google Tag Manager.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {steps.map((step, idx) => (
                    <div key={idx} className="relative group flex flex-col items-center text-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:border-brand/40 group-hover:text-brand transition-all shadow-lg">
                                {step.icon}
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-white">{step.title}</h4>
                                <p className="text-xs text-zinc-500 leading-relaxed font-medium max-w-[200px]">{step.desc}</p>
                            </div>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className="hidden md:block absolute -right-6 top-6 text-zinc-800">
                                <ChevronRight size={20} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600 animate-pulse">Ready? Drag your file above.</p>
            </div>
        </div>
    );
}
