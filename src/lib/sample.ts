import { db, createEntity } from "./db";
import { newCandidate, newJob, newCompany, newApplication } from "./types";
export async function loadSample() {
  await db.transaction(
    "rw",
    [db.candidates, db.jobs, db.companies, db.applications, db.settings],
    async () => {
      if (
        (await db.candidates.count()) ||
        (await db.jobs.count()) ||
        (await db.companies.count())
      )
        throw new Error(
          "Sample data can only be loaded into an empty workspace.",
        );
      const companyNames = [
        "Northstar Studio",
        "Fern Technologies",
        "Arc & Co.",
      ];
      const companies = companyNames.map((name, i) => ({
        ...newCompany(),
        name,
        industry: [
          "Design & software",
          "Financial technology",
          "Enterprise software",
        ][i],
        location: ["Singapore", "Ho Chi Minh City", "Remote"][i],
        notes: "Fictional sample company.",
      }));
      for (const c of companies) await createEntity("companies", c);
      const jobNames = [
        "Senior Frontend Engineer",
        "Product Designer",
        "Full-stack Engineer",
        "Engineering Manager",
      ];
      const jobs = jobNames.map((title, i) => ({
        ...newJob(),
        title,
        companyId: companies[i % 3].id,
        location: ["Singapore", "Ho Chi Minh City", "Remote", "Singapore"][i],
        salary: [
          "USD 4,000–6,000 / month",
          "USD 2,500–4,000 / month",
          "USD 3,500–5,500 / month",
          "USD 6,000–8,000 / month",
        ][i],
        description:
          "Fictional sample role. Replace this description with your own requirements.",
        skills: i === 1 ? ["Figma", "Product design"] : ["React", "TypeScript"],
        priority: i === 0 ? "High" : "Normal",
      }));
      for (const j of jobs) await createEntity("jobs", j);
      const rows = [
        [
          "Alex Morgan",
          "Senior Frontend Engineer",
          "Singapore",
          "8",
          "React,TypeScript,Next.js",
          "Pre-qualification",
        ],
        [
          "Jamie Chen",
          "Product Designer",
          "Ho Chi Minh City",
          "6",
          "Figma,Design systems,UX research",
          "CV update",
        ],
        [
          "Taylor Nguyen",
          "Full-stack Engineer",
          "Da Nang",
          "5",
          "React,Node.js,PostgreSQL",
          "Test",
        ],
        [
          "Jordan Lee",
          "Engineering Manager",
          "Singapore",
          "12",
          "Leadership,Architecture,Python",
          "Not open",
        ],
        [
          "Casey Tran",
          "Backend Engineer",
          "Ho Chi Minh City",
          "7",
          "Go,PostgreSQL,Kubernetes",
          "Interview",
        ],
        [
          "Sam Rivera",
          "Frontend Engineer",
          "Remote",
          "4",
          "React,CSS,Accessibility",
          "CV update",
        ],
        [
          "Riley Park",
          "Product Designer",
          "Singapore",
          "9",
          "Figma,Prototyping,Research",
          "Offer",
        ],
        [
          "Avery Kim",
          "Platform Engineer",
          "Remote",
          "6",
          "AWS,Terraform,Go",
          "Pre-qualification",
        ],
      ];
      const candidates = rows.map((r, i) => ({
        ...newCandidate(),
        cpmID: `DEMO-${1001 + i}`,
        name: r[0],
        headline: r[1],
        location: r[2],
        yearsExperience: r[3],
        skills: r[4].split(","),
        status: r[5],
        email: `sample${i + 1}@example.invalid`,
        salary: i % 2 ? "USD 3,000–4,000 / month" : "USD 4,500 / month",
        source: "Fictional sample",
        expectation:
          "Prefers remote or hybrid work. Interested in product ownership and a collaborative team.",
        notes: "Fictional sample profile. This is not a real person.",
        customFields: [
          { id: crypto.randomUUID(), label: "Notice period", value: "30 days" },
        ],
      }));
      for (const c of candidates) await createEntity("candidates", c);
      const stageList = [
        "Interview",
        "Screening",
        "Contacted",
        "Submitted",
        "Sourced",
        "Offer",
      ];
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setDate(d.getDate() + (i - 2));
        const app = {
          ...newApplication(candidates[i].id, jobs[i % jobs.length].id),
          stage: stageList[i],
          nextAction: [
            "Schedule technical interview",
            "Complete screening call",
            "Follow up on availability",
            "Send profile to hiring manager",
            "First outreach",
            "Discuss offer expectations",
          ][i],
          followUp: d.toLocaleDateString("en-CA"),
        };
        await createEntity("applications", app);
      }
    },
  );
}
export const isSampleCandidate = (c: { cpmID: string; source: string }) =>
  c.cpmID.startsWith("DEMO-") && c.source === "Fictional sample";
export const isSampleJob = (j: { description: string }) =>
  j.description.startsWith("Fictional sample role.");
export const isSampleCompany = (c: { notes: string }) =>
  c.notes === "Fictional sample company.";
/** Deletes only the records `loadSample` created, plus their applications. */
export async function removeSample() {
  return db.transaction(
    "rw",
    [db.candidates, db.jobs, db.companies, db.applications],
    async () => {
      const candidates = (await db.candidates.toArray())
        .filter(isSampleCandidate)
        .map((c) => c.id);
      const jobs = (await db.jobs.toArray())
        .filter(isSampleJob)
        .map((j) => j.id);
      const jobSet = new Set(jobs);
      const stray = await db.applications
        .filter(
          (a) => candidates.includes(a.candidateId) || jobSet.has(a.jobId),
        )
        .primaryKeys();
      await db.applications.bulkDelete(stray);
      await db.candidates.bulkDelete(candidates);
      await db.jobs.bulkDelete(jobs);
      const used = new Set(
        (await db.jobs.toArray()).map((j) => j.companyId).filter(Boolean),
      );
      const companies = (await db.companies.toArray())
        .filter((c) => isSampleCompany(c) && !used.has(c.id))
        .map((c) => c.id);
      await db.companies.bulkDelete(companies);
      return {
        candidates: candidates.length,
        jobs: jobs.length,
        companies: companies.length,
      };
    },
  );
}
