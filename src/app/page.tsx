"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FileUpload from "@/components/FileUpload";
import DashboardSummary from "@/components/DashboardSummary";
import IssuesList from "@/components/IssuesList";
import InventoryTabs from "@/components/InventoryTabs";
import { parseGTMContainer } from "@/lib/gtm-parser";
import { AuditReport } from "@/lib/types";
import { ArrowLeft, RefreshCw, Github, Loader2 } from "lucide-react";

import { SitelogicLogo } from "@/components/SitelogicLogo";
import { Sparkles, ArrowUpRight } from "lucide-react";

import { exportReportToPDF } from "@/lib/pdf-export";

export default function Home() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelect = (json: string) => {
    setIsProcessing(true);
    // Simulate processing time for UX feel
    setTimeout(() => {
      try {
        const auditReport = parseGTMContainer(json);
        setReport(auditReport);
      } catch (err) {
        console.error("Error parsing container:", err);
        alert("Failed to parse container. Ensure it is a valid GTM export JSON.");
      } finally {
        setIsProcessing(false);
      }
    }, 800);
  };

  const handleExportPDF = async () => {
    if (!report) return;
    setIsExporting(true);
    await exportReportToPDF("report-content", `GTM-Audit-${report.containerId}`);
    setIsExporting(false);
  };

  const reset = () => {
    setReport(null);
  };

  return (
    <main className="min-h-screen bg-black text-white selection:bg-brand/30 selection:text-brand relative overflow-x-hidden">
      {/* Sitelogic Signature Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20 space-y-20">

        {/* Navigation */}
        <nav className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <SitelogicLogo className="w-10 h-10 text-brand" />
          </div>
          <a
            href="https://www.sitelogicdigital.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium text-brand hover:text-white transition-colors group"
          >
            Visit sitelogicdigital.com
            <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </nav>

        {!report ? (
          <header className="space-y-8 text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400"
            >
              <Sparkles size={14} className="text-brand" />
              <span>GTM Maintenance & Audit</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-8xl font-black tracking-tighter bg-gradient-to-br from-white via-white to-zinc-500 bg-clip-text text-transparent leading-[0.9]"
            >
              Container <br />
              <span className="text-white">Health Check.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-zinc-400 max-w-2xl mx-auto font-medium"
            >
              Deep dive into your GTM container exports. Discover leaks, cleanup opportunities, and legacy tags in seconds.
            </motion.p>
          </header>
        ) : (
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                GTM Audit <span className="text-brand">Report.</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={reset}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-brand/50 hover:bg-zinc-800 transition-all font-bold text-sm"
              >
                <ArrowLeft size={18} />
                New Audit
              </button>
              <button
                disabled={isExporting}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-brand/50 hover:bg-zinc-800 transition-all font-bold text-sm text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleExportPDF}
              >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <div className="bg-brand/10 p-1 rounded-md"><Sparkles size={14} className="text-brand" /></div>}
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </header>
        )}

        <AnimatePresence mode="wait">
          {!report ? (
            <motion.section
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12"
            >
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                  <RefreshCw className="text-brand animate-spin" size={48} />
                  <p className="text-zinc-400 font-bold animate-pulse">Analyzing Container Structure...</p>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  <FileUpload onFileSelect={handleFileSelect} />
                </div>
              )}
            </motion.section>
          ) : (
            <motion.section
              key="report"
              id="report-content"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-24 animate-in fade-in duration-700 relative"
            >
              {/* Report Navigation Jump Links */}
              <div className="sticky top-4 z-50 flex justify-center">
                <nav className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-full flex items-center gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.8)] ring-1 ring-white/5">
                  <a href="#summary" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-brand transition-colors">Summary</a>
                  <div className="w-px h-3 bg-zinc-800" />
                  <a href="#audit-findings" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-brand transition-colors">Audit Findings</a>
                  <div className="w-px h-3 bg-zinc-800" />
                  <a href="#full-inventory" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-brand transition-colors">Full Inventory</a>
                </nav>
              </div>

              <div id="summary" className="scroll-mt-24">
                <DashboardSummary report={report} />
              </div>

              <div id="audit-findings" className="space-y-12 scroll-mt-24">
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-black tracking-tight uppercase">Audit Findings</h3>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
                <IssuesList report={report} />
              </div>

              <div id="full-inventory" className="space-y-12 scroll-mt-24">
                <div className="flex items-center gap-4">
                  <h3 className="text-3xl font-black tracking-tight uppercase">Full Inventory</h3>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>
                <InventoryTabs report={report} />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="pt-20 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-zinc-600 text-sm font-medium">
            © {new Date().getFullYear()} AuditGTM. Technical health check for marketing containers.
          </p>
          <div className="flex items-center gap-6 text-zinc-600">
            <a href="#" className="hover:text-brand transition-colors flex items-center gap-2 text-sm font-bold">
              <Github size={18} />
              Open Source
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
