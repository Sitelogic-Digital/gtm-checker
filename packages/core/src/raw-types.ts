/**
 * Shapes of a GTM container export as it arrives on disk.
 *
 * These are deliberately loose. Every object carries an index signature so
 * keys we haven't met yet (the 2026 destination tags and container Settings
 * among them) survive the parse and show up in the key survey instead of
 * being silently dropped. Tighten fields here only after a real sample
 * confirms them.
 */

export type RawParamType =
  | 'TEMPLATE'
  | 'BOOLEAN'
  | 'INTEGER'
  | 'LIST'
  | 'MAP'
  | 'TAG_REFERENCE'
  | 'TRIGGER_REFERENCE'
  | (string & {});

export interface RawParam {
  type: RawParamType;
  key?: string;
  value?: string;
  list?: RawParam[];
  map?: RawParam[];
  isWeakReference?: boolean;
  [unknownKey: string]: unknown;
}

export interface RawConsentSettings {
  consentStatus?: 'NOT_SET' | 'NOT_NEEDED' | 'NEEDED' | (string & {});
  consentType?: RawParam;
  [unknownKey: string]: unknown;
}

interface RawEntityBase {
  accountId?: string;
  containerId?: string;
  name?: string;
  type?: string;
  parameter?: RawParam[];
  parentFolderId?: string;
  fingerprint?: string;
  notes?: string;
  [unknownKey: string]: unknown;
}

export interface RawTag extends RawEntityBase {
  tagId: string;
  firingTriggerId?: string[];
  blockingTriggerId?: string[];
  paused?: boolean;
  tagFiringOption?: string;
  consentSettings?: RawConsentSettings;
  setupTag?: Array<{ tagName?: string; stopOnSetupFailure?: boolean }>;
  teardownTag?: Array<{ tagName?: string; stopTeardownOnFailure?: boolean }>;
  priority?: RawParam;
  monitoringMetadata?: RawParam;
}

export interface RawCondition {
  type: string;
  parameter?: RawParam[];
  [unknownKey: string]: unknown;
}

export interface RawTrigger extends RawEntityBase {
  triggerId: string;
  filter?: RawCondition[];
  customEventFilter?: RawCondition[];
  autoEventFilter?: RawCondition[];
  waitForTags?: RawParam;
  checkValidation?: RawParam;
  waitForTagsTimeout?: RawParam;
  uniqueTriggerId?: RawParam;
}

export interface RawVariable extends RawEntityBase {
  variableId: string;
  formatValue?: Record<string, unknown>;
}

export interface RawFolder {
  folderId: string;
  name?: string;
  [unknownKey: string]: unknown;
}

export interface RawBuiltInVariable {
  type?: string;
  name?: string;
  [unknownKey: string]: unknown;
}

export interface RawGalleryReference {
  host?: string;
  owner?: string;
  repository?: string;
  version?: string;
  signature?: string;
  galleryTemplateId?: string;
  [unknownKey: string]: unknown;
}

export interface RawCustomTemplate {
  templateId: string;
  name?: string;
  templateData?: string;
  galleryReference?: RawGalleryReference;
  [unknownKey: string]: unknown;
}

export interface RawContainer {
  accountId?: string;
  containerId?: string;
  name?: string;
  publicId?: string;
  usageContext?: string[];
  [unknownKey: string]: unknown;
}

export interface RawContainerVersion {
  accountId?: string;
  containerId?: string;
  containerVersionId?: string;
  name?: string;
  description?: string;
  container?: RawContainer;
  tag?: RawTag[];
  trigger?: RawTrigger[];
  variable?: RawVariable[];
  folder?: RawFolder[];
  builtInVariable?: RawBuiltInVariable[];
  customTemplate?: RawCustomTemplate[];
  zone?: RawEntityBase[];
  [unknownKey: string]: unknown;
}

export interface RawExport {
  exportFormatVersion?: number;
  exportTime?: string;
  containerVersion: RawContainerVersion;
  [unknownKey: string]: unknown;
}
