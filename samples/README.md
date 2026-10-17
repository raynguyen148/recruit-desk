# Complete fictional workspace

Import `recruitdesk-full-sample.json` through **Settings → Restore workspace JSON**. Review the preview, confirm updates to existing records/settings, then choose **Restore workspace**. This file is never loaded automatically.

The version 1 workspace file contains:

- 24 fictional candidates, with unique CPM IDs `SAMPLE-2001` through `SAMPLE-2024`.
- 8 fictional companies and 12 jobs.
- 36 applications, covering all nine stages. Candidates can have multiple jobs and jobs can have multiple candidates.
- 120 structured profile entries: Experience, Education, Certificate, Project and Other for every candidate.
- 48 contact logs covering all seven channels, 48 candidate custom fields, and 24 job custom fields.
- Candidate availability, expectations, salary, notes and source fields; all job statuses, work modes, priorities and employment types.
- Original vendor column names and sample values in every candidate's `vendorData`: Issue Type, Issue key, Issue id, Summary, Custom field (Years of experience), Custom field (Skill Set), Custom field (Country/ City), Status, Assignee, Assignee Id, Custom field (Sourcer), Custom field (Sourcer)Id, Updated and Due date.
- Complete settings: “Sample recruiting workspace”, system theme, Candidates default page, 50 rows per page and comfortable density.

Follow-up examples are anchored to **17 October 2026**: 15 October is overdue, 17 October is today, and 20 October is upcoming on that date. These are fixed sample dates and will age naturally. Terminal applications have no scheduled follow-up. History ends at each application's current stage.

All people, employers, qualifications and activities are fictional. Email addresses and websites use `.invalid`; phone fields contain non-dialable sample text. Contact logs describe sample activity and do not send messages.

On an empty workspace the preview shows **80 added records and 1 settings update**. Re-importing the unchanged file shows **0 added records and 81 updates**, including settings. Stable `sample-full-` IDs keep this sample separate from the built-in demo. Restore merges with existing records; it does not erase them. Matching sample IDs or CPM IDs are updated, and the included settings replace current preferences after confirmation. Export your workspace first if it contains records or settings you want to preserve.

Automated validation uses an isolated in-memory IndexedDB implementation and the app's real parser, preview, import and export functions. It checks relationship integrity, sample coverage, export/reparse and repeated imports; it does not import anything into your browser.
