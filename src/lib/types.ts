export const candidateStatuses = [
  "Pre-qualification",
  "CV update",
  "Test",
  "Interview",
  "Offer",
  "Placed",
  "Not open",
  "Not suitable",
  "Failed",
] as const;
export type CandidateStatus = (typeof candidateStatuses)[number];
export const closedCandidateStatuses: readonly CandidateStatus[] = [
  "Placed",
  "Not open",
  "Not suitable",
  "Failed",
];
const legacyCandidateStatuses: Record<string, CandidateStatus> = {
  Available: "Pre-qualification",
  "Open to opportunities": "Pre-qualification",
  "Not looking": "Not open",
  "Do not contact": "Not suitable",
  "Pre-Qualification": "Pre-qualification",
  "Updating CV": "CV update",
  "Not Suitable": "Not suitable",
};
/** Maps statuses from older versions/backups onto the current pipeline. */
export function migrateCandidateStatus(value: unknown): unknown {
  return typeof value === "string" && value in legacyCandidateStatuses
    ? legacyCandidateStatuses[value]
    : value;
}
/** Pipeline order used to advance a candidate when an application moves forward. */
const statusProgress: readonly CandidateStatus[] = [
  "Pre-qualification",
  "CV update",
  "Test",
  "Interview",
  "Offer",
  "Placed",
];
const stageStatus: Record<string, CandidateStatus> = {
  Interview: "Interview",
  Offer: "Offer",
  Hired: "Placed",
};
/**
 * The candidate status implied by an application stage, or null when the
 * candidate should stay as is. Only moves forward; a hire always means Placed.
 */
export function advancedCandidateStatus(
  current: string,
  stage: string,
): CandidateStatus | null {
  const target = stageStatus[stage];
  if (!target || target === current) return null;
  if (target === "Placed") return target;
  const from = statusProgress.indexOf(current as CandidateStatus);
  if (from < 0 || from === statusProgress.length - 1) return null;
  return statusProgress.indexOf(target) > from ? target : null;
}
export const jobStatuses = ["Draft", "Open", "On hold", "Closed"] as const;
export const stages = [
  "Sourced",
  "Contacted",
  "Screening",
  "Submitted",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
  "Withdrawn",
] as const;
export const channels = [
  "Email",
  "Phone",
  "LinkedIn",
  "Zalo",
  "Facebook",
  "Referral",
  "Other",
] as const;
export type EntityKind = "candidates" | "jobs" | "companies" | "applications";
export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}
export interface ProfileEntry {
  id: string;
  type: "Experience" | "Education" | "Certificate" | "Project" | "Other";
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  notes: string;
}
export interface CustomField {
  id: string;
  label: string;
  value: string;
}
export interface Contact {
  id: string;
  channel: string;
  date: string;
  note: string;
}
export interface Candidate extends BaseRecord {
  cpmID: string;
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  yearsExperience: string;
  skills: string[];
  status: string;
  salary: string;
  expectation: string;
  notes: string;
  linkedinURL: string;
  source: string;
  entries: ProfileEntry[];
  customFields: CustomField[];
  contacts: Contact[];
  vendorData: Record<string, string>;
}
export interface Job extends BaseRecord {
  title: string;
  companyId: string;
  description: string;
  status: string;
  location: string;
  employmentType: string;
  workMode: string;
  salary: string;
  skills: string[];
  priority: string;
  notes: string;
  customFields: CustomField[];
}
export interface Company extends BaseRecord {
  name: string;
  industry: string;
  location: string;
  website: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
}
export interface Application extends BaseRecord {
  candidateId: string;
  jobId: string;
  stage: string;
  nextAction: string;
  followUp: string;
  notes: string;
  history: { id: string; date: string; stage: string; note: string }[];
}
export interface SavedView {
  id: string;
  page: "candidates" | "jobs" | "applications";
  name: string;
  state: Record<string, string>;
}
export interface Settings {
  id: "workspace";
  theme: "system" | "light" | "dark";
  workspaceName: string;
  defaultPage: "today" | "candidates" | "jobs" | "applications";
  pageSize: number;
  density: "comfortable" | "compact";
  lastBackup: string;
  savedViews?: SavedView[];
  revision: number;
}
export interface Dataset {
  candidates: Candidate[];
  jobs: Job[];
  companies: Company[];
  applications: Application[];
  settings: Settings;
}
export type EntityMap = {
  candidates: Candidate;
  jobs: Job;
  companies: Company;
  applications: Application;
};
export const defaultSettings: Settings = {
  id: "workspace",
  theme: "system",
  workspaceName: "Personal workspace",
  defaultPage: "candidates",
  pageSize: 50,
  density: "comfortable",
  lastBackup: "",
  revision: 0,
};
export function baseRecord(): BaseRecord {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    revision: 0,
  };
}
export function newCandidate(): Candidate {
  return {
    ...baseRecord(),
    cpmID: "",
    name: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    yearsExperience: "",
    skills: [],
    status: "Pre-qualification",
    salary: "",
    expectation: "",
    notes: "",
    linkedinURL: "",
    source: "Manual",
    entries: [],
    customFields: [],
    contacts: [],
    vendorData: {},
  };
}
export function newJob(): Job {
  return {
    ...baseRecord(),
    title: "",
    companyId: "",
    description: "",
    status: "Open",
    location: "",
    employmentType: "Full-time",
    workMode: "Remote",
    salary: "",
    skills: [],
    priority: "Normal",
    notes: "",
    customFields: [],
  };
}
export function newCompany(): Company {
  return {
    ...baseRecord(),
    name: "",
    industry: "",
    location: "",
    website: "",
    contactName: "",
    email: "",
    phone: "",
    notes: "",
  };
}
export function newApplication(candidateId = "", jobId = ""): Application {
  return {
    ...baseRecord(),
    candidateId,
    jobId,
    stage: "Sourced",
    nextAction: "",
    followUp: "",
    notes: "",
    history: [],
  };
}
