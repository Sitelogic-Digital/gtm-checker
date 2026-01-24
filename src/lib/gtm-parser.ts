import {
    AuditReport,
    GTMContainer,
    GTMParameter,
    GTMTag,
    GTMTrigger,
    GTMVariable,
    TagInventoryItem,
    TriggerInventoryItem,
    VariableInventoryItem,
    AuditIssue,
} from "./types";

const TAG_TYPE_MAP: Record<string, string> = {
    googtag: "Google Tag (GA4 Config)",
    gaawe: "GA4 Event",
    html: "Custom HTML",
    ua: "Universal Analytics (Legacy)",
    awct: "Google Ads Conversion",
    flc: "Floodlight Counter",
    fls: "Floodlight Sales",
    sp: "Facebook/Meta Pixel",
    pntr: "Pinterest Tag",
};

const TRIGGER_TYPE_MAP: Record<string, string> = {
    pageview: "Page View",
    customEvent: "Custom Event",
    linkClick: "Link Click",
    click: "All Elements Click",
    formSubmit: "Form Submission",
    jsError: "JavaScript Error",
    historyChange: "History Change",
    timer: "Timer",
    scrollDepth: "Scroll Depth",
    youtubeVideo: "YouTube Video",
    elementVisibility: "Element Visibility",
    triggerGroup: "Trigger Group",
};

const VARIABLE_TYPE_MAP: Record<string, string> = {
    v: "Data Layer Variable",
    c: "Constant",
    jsm: "Custom JavaScript",
    k: "1st Party Cookie",
    u: "URL Variable",
    e: "DOM Element",
    j: "JavaScript Variable",
    f: "HTTP Referrer",
    aev: "Auto-Event Variable",
    gas: "UA Settings (Legacy)",
    gtes: "Google Tag: Event Settings",
    gtcs: "Google Tag: Config Settings",
    smm: "Lookup Table",
    remm: "Regex Table",
};

function getFriendlyType(type: string, map: Record<string, string>): string {
    if (type.startsWith("cvt_")) {
        return `[Custom Template]`;
    }
    return map[type] || type;
}

function calculateAge(fingerprint: string): { date: string; days: number } {
    const ts = parseInt(fingerprint);
    if (isNaN(ts)) return { date: "Unknown", days: 0 };
    const date = new Date(ts);
    const diff = Date.now() - ts;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return {
        date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
        days,
    };
}

function findVariableReferences(obj: any, variableName: string): boolean {
    const pattern = `{{${variableName}}}`;
    const str = JSON.stringify(obj);
    return str.includes(pattern);
}

export function parseGTMContainer(json: string): AuditReport {
    const container: GTMContainer = JSON.parse(json);
    const { tag = [], trigger = [], variable = [] } = container.containerVersion;

    const triggerMap = new Map(trigger.map((t) => [t.triggerId, t.name]));
    const tagMap = new Map(tag.map((t) => [t.name, t]));

    // 1. Tags Inventory
    const tagInventory: TagInventoryItem[] = tag.map((t) => {
        const { date, days } = calculateAge(t.fingerprint);
        const firesOn = (t.firingTriggerId || []).map(
            (id) => triggerMap.get(id) || "Unknown"
        );
        const blockedBy = (t.blockingTriggerId || []).map(
            (id) => triggerMap.get(id) || "Unknown"
        );

        const issues: string[] = [];
        if (t.paused) issues.push("⏸️ Paused");
        if (t.type === "ua") issues.push("🚨 Legacy UA");
        if (days > 365) issues.push("📅 Old");

        return {
            name: t.name,
            type: t.type,
            friendlyType: getFriendlyType(t.type, TAG_TYPE_MAP),
            status: t.paused ? "Paused" : "Active",
            firesOn,
            blockedBy,
            lastModified: date,
            ageDays: days,
            issues,
        };
    });

    // 2. Triggers Inventory
    const triggerInventory: TriggerInventoryItem[] = trigger.map((tr) => {
        const { date, days } = calculateAge(tr.fingerprint);
        const usedByTags = tag.filter(
            (t) =>
                t.firingTriggerId?.includes(tr.triggerId) ||
                t.blockingTriggerId?.includes(tr.triggerId)
        );
        const usedByNames = usedByTags.map((t) => t.name);

        let status: "In Use" | "Unused" | "Blocking Only" = "Unused";
        if (usedByNames.length > 0) {
            const isBlockingOnly = tag.every(
                (t) =>
                    !t.firingTriggerId?.includes(tr.triggerId) &&
                    (t.blockingTriggerId?.includes(tr.triggerId) ||
                        !(
                            t.firingTriggerId?.includes(tr.triggerId) ||
                            t.blockingTriggerId?.includes(tr.triggerId)
                        ))
            );
            // Simplified status logic
            status = "In Use";
        }

        const issues: string[] = [];
        if (usedByNames.length === 0) issues.push("🚨 Unused");
        if (days > 730) issues.push("📅 Old");
        if (usedByTags.length > 0 && usedByTags.every((t) => t.paused)) {
            issues.push("⚠️ Only used by paused tags");
        }

        return {
            name: tr.name,
            type: tr.type,
            friendlyType: getFriendlyType(tr.type, TRIGGER_TYPE_MAP),
            usedBy: usedByNames,
            status: usedByNames.length > 0 ? "In Use" : "Unused",
            lastModified: date,
            ageDays: days,
            issues,
        };
    });

    // 3. Variables Inventory
    const variableInventory: VariableInventoryItem[] = variable.map((v) => {
        const { date, days } = calculateAge(v.fingerprint);

        const usedByTags = tag.filter((t) => findVariableReferences(t, v.name));
        const usedByTriggers = trigger.filter((tr) =>
            findVariableReferences(tr, v.name)
        );
        const usedByOtherVars = variable.filter(
            (ov) => ov.name !== v.name && findVariableReferences(ov, v.name)
        );

        const usedByNames = [
            ...usedByTags.map((t) => t.name),
            ...usedByTriggers.map((tr) => tr.name),
            ...usedByOtherVars.map((ov) => ov.name),
        ];

        const issues: string[] = [];
        if (usedByNames.length === 0) issues.push("🚨 Unused");
        if (v.type === "gas") issues.push("🚨 Legacy UA Settings");
        if (days > 730) issues.push("📅 Old");
        if (
            usedByTags.length > 0 &&
            usedByTags.every((t) => t.paused) &&
            usedByTriggers.length === 0 &&
            usedByOtherVars.length === 0
        ) {
            issues.push("⚠️ Only used by paused tag(s)");
        }

        return {
            name: v.name,
            type: v.type,
            friendlyType: getFriendlyType(v.type, VARIABLE_TYPE_MAP),
            usedBy: usedByNames,
            status: usedByNames.length > 0 ? "In Use" : "Unused",
            lastModified: date,
            ageDays: days,
            issues,
        };
    });

    // 4. Health Score & Issues
    let score = 100;
    const critical: AuditIssue[] = [];
    const cleanup: AuditIssue[] = [];
    const maintenance: AuditIssue[] = [];

    // Deductions & Issue Generation
    const legacyUA = tagInventory.filter((t) => t.type === "ua");
    const legacyVars = variableInventory.filter((v) => v.type === "gas");
    if (legacyUA.length > 0 || legacyVars.length > 0) {
        const legacyCount = legacyUA.length + legacyVars.length;
        // Cap legacy deduction at 30 points to avoid total score tanking
        score -= Math.min(30, legacyCount * 5);
        critical.push({
            id: "legacy-ua",
            severity: "critical",
            title: "Legacy Universal Analytics Elements",
            description: "Universal Analytics stopped processing data on July 1, 2024.",
            recommendation: "These tags and variables should be removed or migrated to GA4.",
            affectedItems: [
                ...legacyUA.map((t) => t.name),
                ...legacyVars.map((v) => v.name),
            ],
        });
    }

    const ga4Config = tag.find((t) => t.type === "googtag");
    if (!ga4Config) {
        score -= 10;
        critical.push({
            id: "missing-ga4",
            severity: "critical",
            title: "Missing GA4 Configuration",
            description: "No GA4 Configuration tag detected.",
            recommendation: "Add a Google Tag for GA4 to ensure proper data collection.",
            affectedItems: [],
        });
    }

    const pausedTags = tagInventory.filter((t) => t.status === "Paused");
    if (pausedTags.length > 0) {
        // Forgiving scoring: -2 for first 5, then -1 for every 10 after that. Max -15.
        let pausedDeduction = 0;
        if (pausedTags.length <= 5) {
            pausedDeduction = pausedTags.length * 2;
        } else {
            pausedDeduction = 10 + Math.floor((pausedTags.length - 5) / 10);
        }
        score -= Math.min(15, pausedDeduction);

        cleanup.push({
            id: "paused-tags",
            severity: "warning",
            title: "Paused Tags",
            description: `${pausedTags.length} tags are currently paused.`,
            recommendation: "Review these tags. Delete them if no longer needed.",
            affectedItems: pausedTags.map((t) => t.name),
        });
    }

    const unusedTriggers = triggerInventory.filter((tr) => tr.status === "Unused");
    if (unusedTriggers.length > 0) {
        // -3 for first 5, then -1 for every 10 after. Max -20.
        let triggerDeduction = 0;
        if (unusedTriggers.length <= 5) {
            triggerDeduction = unusedTriggers.length * 3;
        } else {
            triggerDeduction = 15 + Math.floor((unusedTriggers.length - 5) / 10);
        }
        score -= Math.min(20, triggerDeduction);

        cleanup.push({
            id: "unused-triggers",
            severity: "warning",
            title: "Unused Triggers",
            description: `${unusedTriggers.length} triggers are not used by any tags.`,
            recommendation: "Delete unused triggers to reduce container clutter.",
            affectedItems: unusedTriggers.map((tr) => tr.name),
        });
    }

    const unusedVariables = variableInventory.filter((v) => v.status === "Unused");
    if (unusedVariables.length > 0) {
        // -2 for first 5, then -1 for every 10 after. Max -15.
        let varDeduction = 0;
        if (unusedVariables.length <= 5) {
            varDeduction = unusedVariables.length * 2;
        } else {
            varDeduction = 10 + Math.floor((unusedVariables.length - 5) / 10);
        }
        score -= Math.min(15, varDeduction);

        cleanup.push({
            id: "unused-variables",
            severity: "warning",
            title: "Unused Variables",
            description: `${unusedVariables.length} variables are not referenced anywhere.`,
            recommendation: "Safe to delete unless planned for future use.",
            affectedItems: unusedVariables.map((v) => v.name),
        });
    }

    const oldElements = [
        ...tagInventory.filter((t) => t.ageDays > 365),
        ...triggerInventory.filter((tr) => tr.ageDays > 365),
        ...variableInventory.filter((v) => v.ageDays > 365),
    ];
    if (oldElements.length > 0) {
        // -1 pt for every 15 elements, cap at 10.
        score -= Math.min(10, Math.ceil(oldElements.length / 15));

        maintenance.push({
            id: "old-elements",
            severity: "info",
            title: "Old Elements (1+ Year)",
            description: "These elements haven't been touched in over a year.",
            recommendation: "Review to ensure they're still serving their purpose.",
            affectedItems: oldElements.map((e) => e.name),
        });
    }

    score = Math.max(0, score);


    // 5. Classification
    const platform: Record<string, number> = {};
    tagInventory.forEach((t) => {
        let p = "Other Platforms";
        if (t.friendlyType.includes("GA4")) p = "Google Analytics (GA4)";
        else if (t.friendlyType.includes("Google Ads")) p = "Google Ads";
        else if (t.friendlyType.includes("Meta") || t.friendlyType.includes("Facebook"))
            p = "Meta/Facebook";
        else if (t.friendlyType.includes("Custom HTML")) p = "Custom HTML";

        platform[p] = (platform[p] || 0) + 1;
    });

    return {
        containerId: container.containerVersion.containerId,
        versionId: container.containerVersion.containerVersionId,
        metrics: {
            totalTags: tag.length,
            totalTriggers: trigger.length,
            totalVariables: variable.length,
            healthScore: score,
        },
        tags: tagInventory.sort((a, b) => b.issues.length - a.issues.length),
        triggers: triggerInventory.sort((a, b) => b.issues.length - a.issues.length),
        variables: variableInventory.sort((a, b) => b.issues.length - a.issues.length),
        issues: { critical, cleanup, maintenance },
        classification: {
            platform,
            purpose: {}, // Could involve more complex logic
            status: {
                Active: tag.filter((t) => !t.paused).length,
                Paused: tag.filter((t) => t.paused).length,
            },
        },
    };
}
