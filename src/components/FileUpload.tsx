"use client";

import React, { useState, useCallback } from "react";
import { Upload, FileJson, AlertCircle } from "lucide-react";

interface FileUploadProps {
    onFileSelect: (json: string) => void;
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const processFile = async (file: File) => {
        if (file.type !== "application/json" && !file.name.endsWith(".json")) {
            setError("Please upload a valid JSON file.");
            return;
        }

        try {
            const text = await file.text();
            // Basic validation if it's GTM export
            if (!text.includes("containerVersion")) {
                setError("This doesn't look like a GTM container export file.");
                return;
            }
            onFileSelect(text);
            setError(null);
        } catch (err) {
            setError("Error reading file. Please try again.");
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center bg-zinc-900 shadow-2xl shadow-black ${isDragging
                    ? "border-brand bg-brand/5 scale-[1.02]"
                    : "border-zinc-800 hover:border-brand/50 hover:bg-zinc-800"
                    }`}
            >
                <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300 ${isDragging ? 'bg-brand text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-brand/20 group-hover:text-brand'}`}>
                    <Upload size={32} />
                </div>

                <h3 className="text-2xl font-bold mb-2 text-white">Upload GTM Container</h3>
                <p className="text-zinc-400 text-center max-w-sm">
                    Drag and drop your exported JSON file here, or click to browse.
                </p>

            </div>

            {error && (
                <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle size={20} />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
        </div>
    );
}
