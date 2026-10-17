export const candidateStatuses = [
  "Available",
  "Open to opportunities",
  "Not looking",
  "Do not contact",
] as const;
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
export interface Settings {
  id: "workspace";
  theme: "system" | "light" | "dark";
  workspaceName: string;
  defaultPage: "candidates" | "jobs" | "applications";
  pageSize: number;
  density: "comfortable" | "compact";
  lastBackup: string;
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
    status: "Available",
    salary: "",
    expectation: "",
    notes: "",
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
