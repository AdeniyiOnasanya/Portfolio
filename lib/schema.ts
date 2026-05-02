import { z } from 'zod';
import { SafeText } from './text/safeText';
import { THEME_MODES } from './theme/resolve';

// Object schemas in this file do not call .strict(); Zod 4 strips unknown keys
// from the parsed value, which keeps the schema resilient to fixture drift but
// means a stray field will silently disappear at parse time. The single source
// of truth for content is content/site.json, so any new field must be declared
// here before it can be observed by consumers.

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// NonEmptyString is for short identifiers and labels (slugs, tech names,
// titles); it stays permissive so identifier fields are never tripped by the
// long-form refinement. SafeText (in lib/text/safeText.ts) is the alias used
// for prose: it adds runtime rejection of U+2014 and Extended_Pictographic on
// top of the same min(1), giving defence-in-depth alongside the static
// scripts/check-forbidden-chars.ts file scan.
const NonEmptyString = z.string().min(1);
const SlugString = z.string().regex(SLUG_PATTERN, {
  message: 'slug must be kebab-case lowercase, digits and dashes only.',
});

export const PersonSchema = z.object({
  name: NonEmptyString,
  role: NonEmptyString,
  location: NonEmptyString,
  phone: NonEmptyString,
  email: z.email(),
  cvUrl: NonEmptyString,
  cvDocxUrl: NonEmptyString,
  github: z.url(),
  linkedin: z.url(),
  yearsExp: z.number().int().nonnegative(),
  statement: SafeText,
  longBio: z.array(SafeText).min(1),
});
export type Person = z.infer<typeof PersonSchema>;

const SkillGroupSchema = z.object({
  label: NonEmptyString,
  items: z.array(NonEmptyString).min(1),
});
export const SkillsSchema = z.array(SkillGroupSchema).min(1);
export type Skills = z.infer<typeof SkillsSchema>;

const ExperienceEntrySchema = z.object({
  role: NonEmptyString,
  company: NonEmptyString,
  where: NonEmptyString,
  when: NonEmptyString,
  desc: SafeText,
  tags: z.array(NonEmptyString).min(1),
});
export const ExperienceSchema = z.array(ExperienceEntrySchema).min(1);
export type Experience = z.infer<typeof ExperienceSchema>;

const VisualSchema = z.object({
  label: NonEmptyString,
  w: z.enum(['wide', 'tall']),
  span: z.union([z.literal(1), z.literal(2)]).optional(),
});

const MetaSchema = z.object({
  Year: NonEmptyString,
  Role: NonEmptyString,
  Sector: NonEmptyString,
  Status: NonEmptyString,
});

const MetricSchema = z.object({
  value: NonEmptyString,
  prefix: NonEmptyString.optional(),
  suffix: NonEmptyString.optional(),
  label: SafeText,
  note: SafeText.optional(),
});

const BeforeAfterSchema = z.object({
  intro: SafeText,
  beforeLabel: SafeText,
  afterLabel: SafeText,
});

const ProcessStepSchema = z.object({
  title: NonEmptyString,
  desc: SafeText,
});

const LessonSchema = z.object({
  title: NonEmptyString,
  body: SafeText,
});

const DeepDiveSchema = z.object({
  metricsIntro: SafeText,
  metrics: z.array(MetricSchema).min(1),
  beforeAfter: BeforeAfterSchema,
  process: z.array(ProcessStepSchema).min(1),
  lessons: z.array(LessonSchema).min(1),
});

// ProjectSchema describes the structured fields of a project: enough for the
// home-page index card and for the case-study page header. Long-form prose
// (problem, approach, outcome) lives in the MDX body of
// content/projects/<slug>.mdx. The structured deepDive optionally lives in
// the MDX frontmatter rather than site.json so the case-study page can read
// the whole project from a single file.
export const ProjectSchema = z.object({
  slug: SlugString,
  n: NonEmptyString,
  title: NonEmptyString,
  subtitle: SafeText,
  year: NonEmptyString,
  role: NonEmptyString,
  kind: NonEmptyString,
  stack: z.array(NonEmptyString).min(1),
  tagline: SafeText,
  summary: SafeText,
  visuals: z.array(VisualSchema).min(1),
  meta: MetaSchema,
  deepDive: DeepDiveSchema.optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

// site.json.projects is the ordered slug list that drives the home-page
// index strip. The structured fields (n, title, subtitle, ...) plus the
// case-study prose live in content/projects/<slug>.mdx and are loaded via
// lib/projects.ts. Keeping site.json lean removes the parallel source of
// truth that earlier slices created.
export const ProjectsSchema = z
  .array(SlugString)
  .min(1)
  .superRefine((slugs, ctx) => {
    const seen = new Map<string, number>();
    slugs.forEach((slug, index) => {
      const previous = seen.get(slug);
      if (previous !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [index],
          message: `Duplicate slug "${slug}" (also at index ${previous}).`,
        });
      } else {
        seen.set(slug, index);
      }
    });
  });
export type Projects = z.infer<typeof ProjectsSchema>;

export const CertsSchema = z.array(NonEmptyString).min(1);
export type Certs = z.infer<typeof CertsSchema>;

const EducationEntrySchema = z.object({
  degree: NonEmptyString,
  school: NonEmptyString,
  result: NonEmptyString,
});
export const EducationSchema = z.array(EducationEntrySchema).min(1);
export type Education = z.infer<typeof EducationSchema>;

const PillarSchema = z.object({
  n: NonEmptyString,
  title: NonEmptyString,
  body: SafeText,
});

const WorkflowItemSchema = z.object({
  k: NonEmptyString,
  v: SafeText,
});

export const AiPracticeSchema = z.object({
  eyebrow: NonEmptyString,
  // headline carries inline <em>...</em> by design (project-scope.md "preserve <em>
  // semantics in headline"). Slice #21 must not strip HTML when refining SafeText.
  headline: SafeText,
  intro: SafeText,
  pillars: z.array(PillarSchema).min(1),
  workflow: z.array(WorkflowItemSchema).min(1),
});
export type AiPractice = z.infer<typeof AiPracticeSchema>;

export const FooterSchema = z.object({
  heading: NonEmptyString,
  copy: SafeText,
  availability: NonEmptyString,
  copyright: NonEmptyString,
});
export type Footer = z.infer<typeof FooterSchema>;

export const SettingsSchema = z.object({
  // defaultTheme tracks lib/theme/resolve.ts so the schema cannot drift from
  // the runtime theme module. Adding a new mode to THEME_MODES updates both
  // the resolver and the content fixture in one place.
  defaultTheme: z.enum(THEME_MODES),
  intro: z.boolean(),
  visibility: z.object({
    about: z.boolean(),
    skills: z.boolean(),
    experience: z.boolean(),
    ai: z.boolean(),
    work: z.boolean(),
    commandPalette: z.boolean(),
  }),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const SiteSchema = z.object({
  person: PersonSchema,
  skills: SkillsSchema,
  experience: ExperienceSchema,
  projects: ProjectsSchema,
  certs: CertsSchema,
  education: EducationSchema,
  aiPractice: AiPracticeSchema,
  footer: FooterSchema,
  settings: SettingsSchema,
});
export type Site = z.infer<typeof SiteSchema>;
