/**
 * TypeScript types for the NACE-OSM Taxonomy schema (v1.1.0).
 * All v1.1.0 fields are optional to preserve backward compatibility with v1.0.0.
 */

export type LanguageCode = 'en' | 'uk' | 'de' | 'ru' | (string & {});

export type LocalizedNames = {
  en: string;
  uk: string;
  de: string;
  ru: string;
  original?: string;
} & Partial<Record<LanguageCode, string>>;

export type LocalizedAltLabels = Partial<Record<LanguageCode, string[]>>;

export type AttributeType =
  | 'money'
  | 'duration'
  | 'boolean'
  | 'integer'
  | 'string'
  | 'enum';

export interface AttributeSchemaEntry {
  type: AttributeType;
  unit?: string;
  values?: string[];
}

export interface TemplateAttributes {
  required: string[];
  optional: string[];
  schema: Record<string, AttributeSchemaEntry>;
}

export interface LinguisticHints {
  triggers?: LocalizedAltLabels;
  antiTriggers?: LocalizedAltLabels;
  adjacentTemplates?: string[];
}

export interface ExpectedRelation {
  predicate: string;
  target: string;
  cardinality: 'one' | 'many';
}

export interface Template {
  '@id'?: string;
  slug: string;
  names: LocalizedNames;
  altLabels?: LocalizedAltLabels;
  wikidataId?: string;
  osmTag?: string;
  attributes?: TemplateAttributes;
  linguisticHints?: LinguisticHints;
  crossLinks?: string[];
}

export interface Subcategory {
  '@id'?: string;
  slug: string;
  names: LocalizedNames;
  altLabels?: LocalizedAltLabels;
  osmTag?: string;
  naceRef?: string;
  schemaOrgType?: string;
  wikidataId?: string;
  expectedRelations?: ExpectedRelation[];
  templates: Template[];
}

export interface Category {
  '@context'?: string;
  '@id'?: string;
  slug: string;
  version?: string;
  names: LocalizedNames;
  altLabels?: LocalizedAltLabels;
  icon: string;
  naceRef: string;
  schemaOrgType?: string;
  wikidataId?: string;
  subcategories: Subcategory[];
}

export interface TaxonomyDocument {
  '@context': unknown;
  '@id': string;
  '@type': 'skos:ConceptScheme';
  version: string;
  generatedAt: string;
  categoriesCount: number;
  categories: Category[];
}
