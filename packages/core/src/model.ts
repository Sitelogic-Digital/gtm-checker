/**
 * The normalised container model every view and rule works from.
 * Built from IDs, never from names.
 */
import type { RawParam } from './raw-types';

/** A parameter tree flattened into plain values. */
export type ParamValue =
  | string
  | boolean
  | ParamValue[]
  | { [key: string]: ParamValue }
  | { $ref: 'tag' | 'trigger'; value: string };

export type ContainerState = 'Legacy' | 'Optimized' | 'Mixed';
/** Only web containers are audited; others are rejected at import. 'unknown' = field missing, treated as web. */
export type UsageContext = 'web' | 'unknown';
export type ConsentStatus = 'NOT_SET' | 'NOT_NEEDED' | 'NEEDED' | 'UNKNOWN';

export type TagCategory =
  | 'google-tag'
  | 'ga4-config'
  | 'ga4-event'
  | 'ga4-destination'
  | 'google-ads'
  | 'floodlight'
  | 'conversion-linker'
  | 'universal-analytics'
  | 'custom-html'
  | 'custom-image'
  | 'template'
  | 'marketing'
  | 'other';

export interface TemplateRef {
  templateId: string;
  name: string;
  /** e.g. "github.com/stape-io/facebook-tag@<sha>" when it came from the gallery. */
  gallery?: { host?: string; owner?: string; repository?: string; version?: string; galleryTemplateId?: string };
  /** Permission keys declared in ___WEB_PERMISSIONS___, e.g. "inject_script". */
  permissions: string[];
  /** Plain-English descriptions of permissions granted with no restriction, e.g. "inject scripts from any domain". */
  broadPermissions: string[];
}

export interface TypeInfo {
  key: string;
  label: string;
  category: TagCategory | 'variable' | 'trigger';
  recognised: boolean;
  template?: TemplateRef;
}

/** Where a {{Variable}} reference sits and what it resolves to. */
export interface VariableRef {
  name: string;
  /** Dotted path inside the entity, e.g. "parameter.eventSettingsTable[2].parameterValue". */
  path: string;
  resolution:
    | { kind: 'user'; variableId: string }
    | { kind: 'builtin-enabled'; builtInType?: string }
    | { kind: 'builtin-disabled'; builtInType: string }
    | { kind: 'missing' };
}

export interface EntityBase {
  id: string;
  name: string;
  type: TypeInfo;
  folderId?: string;
  notes?: string;
  params: Record<string, ParamValue>;
  rawParams: RawParam[];
  varRefs: VariableRef[];
  /** Keys on the raw object we don't model yet. Values kept verbatim. */
  extra: Record<string, unknown>;
}

export interface Tag extends EntityBase {
  kind: 'tag';
  firingTriggerIds: string[];
  blockingTriggerIds: string[];
  paused: boolean;
  firingOption?: string;
  consent: { status: ConsentStatus; types: string[] };
  setupTagNames: string[];
  teardownTagNames: string[];
  priority?: number;
}

export type ConditionOperator =
  | 'EQUALS'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'MATCH_REGEX'
  | 'CSS_SELECTOR'
  | 'GREATER'
  | 'GREATER_OR_EQUALS'
  | 'LESS'
  | 'LESS_OR_EQUALS'
  | (string & {});

export interface Condition {
  operator: ConditionOperator;
  left: string;
  right: string;
  negate: boolean;
  ignoreCase: boolean;
}

export interface Trigger extends EntityBase {
  kind: 'trigger';
  builtIn: boolean;
  filters: Condition[];
  customEventFilters: Condition[];
  autoEventFilters: Condition[];
  waitForTags?: boolean;
  checkValidation?: boolean;
  /** For trigger groups. */
  groupTriggerIds: string[];
}

export interface Variable extends EntityBase {
  kind: 'variable';
}

export interface Folder {
  kind: 'folder';
  id: string;
  name: string;
}

export interface BuiltInVariable {
  type: string;
  name: string;
}

export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  code:
    | 'UNKNOWN_TYPE'
    | 'UNKNOWN_KEY'
    | 'DANGLING_TRIGGER'
    | 'DANGLING_FOLDER'
    | 'DANGLING_TAG_REF'
    | 'DUPLICATE_ID'
    | 'MALFORMED_ENTITY'
    | 'UNRESOLVED_TEMPLATE';
  message: string;
  entity?: { kind: 'tag' | 'trigger' | 'variable' | 'folder' | 'template' | 'container'; id: string };
  detail?: Record<string, unknown>;
}

export interface UnknownKeySurvey {
  /** Location such as "containerVersion", "tag", "tag.consentSettings". */
  [location: string]: Record<string, number>;
}

export interface StateDetection {
  state: ContainerState;
  /** True until the 2026 signals have been confirmed against real optimized exports. */
  provisional: boolean;
  legacySignals: string[];
  optimizedSignals: string[];
  /**
   * Things we can't explain that might come from the 2026 optimization:
   * unrecognised non-template tag/trigger types and unmodelled containerVersion keys.
   * When this is non-empty, ask for a copy of the export so the catalog can be updated.
   */
  unexplainedSignals: string[];
}

export interface ContainerModel {
  meta: {
    exportFormatVersion?: number;
    exportTime?: string;
    accountId: string;
    containerId: string;
    publicId: string;
    containerName: string;
    versionId?: string;
    versionName?: string;
    usageContext: UsageContext;
  };
  state: StateDetection;
  tags: Tag[];
  triggers: Trigger[];
  variables: Variable[];
  folders: Folder[];
  builtInVariables: BuiltInVariable[];
  templates: TemplateRef[];
  /** Top-level containerVersion keys we don't model yet, kept verbatim (likely home of 2026 Settings). */
  extraContainerVersion: Record<string, unknown>;
  unknownKeys: UnknownKeySurvey;
  diagnostics: Diagnostic[];
}
