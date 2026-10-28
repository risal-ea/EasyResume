/** Short version, sent as the MCP server `instructions` on connect. */
export const SERVER_INSTRUCTIONS = `EasyResume stores the user's career profile (experience, education, skills, certifications, projects) and turns it into ATS-friendly resumes tailored to a job description.

When the user asks for a resume for a job:
1. Call get_resume_guidelines once (the full rules), then get_profile.
2. Extract 15-30 keywords from the job description.
3. Call create_resume with the chosen profile items (by id) and rewritten bullets.
4. Read the ATS report in the result, fix gaps with update_resume, then give the user the download links.

Never invent employers, titles, dates, degrees, certifications, skills or metrics. If something important is missing from the profile, ask the user.`;

/** Full rules, returned by get_resume_guidelines and the tailor_resume prompt. */
export const RESUME_GUIDELINES = `# EasyResume: how to tailor an ATS-friendly resume

## Workflow
1. **Read the profile** with \`get_profile\`. Every item has an \`id\`; you will reference items by id. The \`notes\` field holds extra context from the user.
2. **Analyse the job description.** Identify the target title, seniority, must-have skills, nice-to-have skills, tools, certifications, domain terms and soft skills. Pick 15-30 **keywords** using the exact wording the job description uses (e.g. "CI/CD", "Kubernetes", "stakeholder management").
3. **Choose content.** Select the experience, projects, education and certifications that best support this job. Keep all recent and relevant jobs; older or unrelated roles can be shortened or dropped. Aim for 1 page (under ~8 years of experience) or 2 pages maximum.
4. **Write the content** (rules below) and call \`create_resume\`. Pass the keywords so the ATS check can score coverage.
5. **Review the ATS report** returned by the tool: keyword coverage, missing keywords, issues and warnings.
   - For each missing keyword: if the profile shows the user has that skill or experience, work it in naturally (summary, a bullet or the skills section) with \`update_resume\`.
   - If the profile does **not** show it, do not add it. Tell the user it is missing and ask whether they have that experience.
   - Fix the listed issues (weak openers, long bullets, missing metrics, length).
6. **Report back**: the web link and file paths, the final keyword coverage, keywords you could not honestly cover, and questions that would let you strengthen the resume (e.g. "Do you have a number for how much the migration saved?").

## Truthfulness (most important)
- Never invent employers, job titles, dates, degrees, schools, certifications, skills, tools, metrics or achievements. The server fills in employers, titles, dates, schools and certificate names from the profile; you only supply ids and wording.
- You may rephrase, reorder, merge or shorten the user's achievements, and use the job description's terminology for things the user actually did (e.g. "event-driven architecture" for work the profile describes as "Kafka-based async processing").
- Only use numbers that appear in the profile or that the user gives you. If a bullet would be stronger with a metric you don't have, ask the user instead of guessing.
- Skills listed must come from the profile (skills, technologies, courses, or text). The server warns about skills it cannot find.

## Writing rules
- **Headline**: taken from the job description. Set \`targetTitle\` to the exact job title the posting uses (without location or team suffixes, e.g. "Senior Backend Engineer"); it becomes the headline. Only send \`headline\` to adjust it, e.g. when the posting's seniority is above the user's real level, or to add a specialty from the job description ("Senior Backend Engineer | Payments").
- **Summary**: 2-4 sentences, 40-80 words, no "I/my". Years of experience + core specialty + 2-3 strongest relevant skills or results + what they bring to this role.
- **Bullets**: 3-6 per recent role, 1-3 for older roles. Each one line or two at most (under ~30 words).
  - Start with a strong past-tense action verb (Built, Led, Reduced, Designed, Automated); present tense for the current role is fine.
  - Formula: action + what + how (tools) + result (metric). Example: "Reduced p99 API latency 78% (850→190 ms) by adding Redis caching and rewriting hot PostgreSQL queries."
  - Put the most job-relevant bullet first in each role.
  - Avoid "Responsible for", "Worked on", "Helped with", buzzword stacks and first-person pronouns.
- **Skills**: 3-6 groups (e.g. Languages, Frameworks, Cloud & DevOps, Data, Tools). Put the job's must-have skills first. List each skill once. Spell skills the way the job description does (e.g. "PostgreSQL" not "Postgres" if the JD says PostgreSQL).
- **Keywords**: each must-have keyword should appear at least once, ideally in context (a bullet) as well as in Skills. Don't stuff keywords or repeat them unnaturally.
- **Order**: Summary, Skills, Work Experience, Projects, Education, Certifications is the default. Recent graduates can put Education before Work Experience (use \`sectionOrder\`).
- Work experience must be reverse-chronological.
- Spell out an acronym once if the JD does ("Amazon Web Services (AWS)").

## Formatting (handled by the server)
The server renders a single-column layout with standard section headings, real text (no tables, images, icons or text boxes), contact details in the body and consistent dates. Do not add markdown, emojis or bullet characters to the text you send.`;

export function tailorResumePrompt(jobDescription: string): string {
  return `${RESUME_GUIDELINES}

---

Create an ATS-friendly resume for the job below using EasyResume. Start by calling get_profile.

<job_description>
${jobDescription}
</job_description>`;
}
