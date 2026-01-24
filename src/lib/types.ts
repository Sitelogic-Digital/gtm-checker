export interface GTMParameter {
    type: string;
    key: string;
    value?: string;
    list?: GTMParameter[];
    map?: GTMParameter[];
}

export interface GTMFilter {
    type: string;
    parameter: GTMParameter[];
}

export interface GTMTag {
    name: string;
    type: string;
    tagId: string;
    firingTriggerId?: string[];
    blockingTriggerId?: string[];
    paused?: boolean;
    parameter: GTMParameter[];
    fingerprint: string;
}

export interface GTMTrigger {
    name: string;
    type: string;
    triggerId: string;
    filter?: GTMFilter[];
    fingerprint: string;
}

export interface GTMVariable {
    name: string;
    type: string;
    variableId: string;
    parameter: GTMParameter[];
    fingerprint: string;
}

export interface GTMContainer {
    containerVersion: {
        containerId: string;
        containerVersionId: string;
        tag: GTMTag[];
        trigger: GTMTrigger[];
        variable: GTMVariable[];
    };
}

export interface AuditIssue {
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    recommendation: string;
    affectedItems: string[];
}

export interface AuditReport {
    containerId: string;
    versionId: string;
    metrics: {
        totalTags: number;
        totalTriggers: number;
        totalVariables: number;
        healthScore: number;
    };
    tags: TagInventoryItem[];
    triggers: TriggerInventoryItem[];
    variables: VariableInventoryItem[];
    issues: {
        critical: AuditIssue[];
        cleanup: AuditIssue[];
        maintenance: AuditIssue[];
    };
    classification: {
        platform: Record<string, number>;
        purpose: Record<string, number>;
        status: Record<string, number>;
    };
}

export interface TagInventoryItem {
    name: string;
    type: string;
    friendlyType: string;
    status: "Active" | "Paused" | "Blocked";
    firesOn: string[];
    blockedBy: string[];
    lastModified: string;
    ageDays: number;
    issues: string[];
}

export interface TriggerInventoryItem {
    name: string;
    type: string;
    friendlyType: string;
    usedBy: string[];
    status: "In Use" | "Unused" | "Blocking Only";
    lastModified: string;
    ageDays: number;
    issues: string[];
}

export interface VariableInventoryItem {
    name: string;
    type: string;
    friendlyType: string;
    usedBy: string[];
    status: "In Use" | "Unused" | "Paused Tag Only";
    lastModified: string;
    ageDays: number;
    issues: string[];
}
