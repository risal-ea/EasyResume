import { existsSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exampleProfileForForm } from "../src/core/exampleProfile";
import { createMcpServer } from "../src/mcp/server";
import { getPendingImport, saveUpload } from "../src/core/store/importStore";
import { loadProfile, saveProfile } from "../src/core/store/profileStore";
import { getResume, listResumes, resumeFilePath } from "../src/core/store/resumeStore";
import { fixture, sampleProfile, useTempHome } from "./helpers";

describe("MCP server", () => {
  useTempHome();
  let client: Client;

  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createMcpServer().connect(serverTransport);
    client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientTransport);
  });
  afterEach(() => client.close());

  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
    const text = result.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
    return { text, isError: result.isError ?? false };
  };

  it("lists the tools and the prompt, and sends instructions", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "check_ats",
        "create_resume",
        "get_profile",
        "get_resume",
        "get_resume_guidelines",
        "get_uploaded_resume",
        "import_profile",
        "list_resumes",
        "update_resume",
      ],
    );
    const create = tools.find((t) => t.name === "create_resume")!;
    expect(create.inputSchema.required).toEqual(expect.arrayContaining(["targetTitle", "jobDescription"]));
    const update = tools.find((t) => t.name === "update_resume")!;
    expect(update.inputSchema.required).toEqual(["resumeId"]);

    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual(["import_resume", "tailor_resume"]);
    const prompt = await client.getPrompt({ name: "tailor_resume", arguments: { job_description: "Go engineer" } });
    expect(JSON.stringify(prompt.messages)).toContain("Go engineer");
    expect(client.getInstructions()).toContain("get_profile");
  });

  it("asks the user to fill in an empty profile", async () => {
    const { text } = await call("get_profile");
    expect(text).toContain("/profile");
  });

  it("runs the full create → check → update → list flow", async () => {
    saveProfile(sampleProfile());
    expect((await call("get_profile")).text).toContain('"id": "exp-fintrail"');

    const created = await call("create_resume", {
      targetTitle: "Senior Backend Engineer",
      company: "Northwind Pay",
      jobDescription: fixture("sample-jd.txt"),
      keywords: ["Go", "Kafka", "PostgreSQL", "gRPC", "microservices"],
      summary: "Backend engineer with 7 years building payment systems.",
      experience: [{ profileId: "exp-fintrail" }, { profileId: "exp-shopwise" }],
      education: [{ profileId: "edu-ut" }],
      skills: [{ category: "Languages", items: ["Go", "Python"] }],
    });
    expect(created.isError).toBe(false);
    expect(created.text).toContain("Keyword coverage: 60% (3/5)");
    expect(created.text).toContain("Missing keywords: gRPC, microservices");

    const [record] = listResumes();
    expect(record).toBeDefined();
    for (const format of ["pdf", "docx", "md"] as const) expect(existsSync(resumeFilePath(record!, format))).toBe(true);

    const checked = await call("check_ats", { resumeId: record!.id, keywords: ["Go", "Kafka"] });
    expect(checked.text).toContain("Keyword coverage: 100% (2/2)");

    const updated = await call("update_resume", {
      resumeId: record!.id,
      skills: [{ category: "Languages", items: ["Go", "Python", "SQL"] }],
    });
    expect(updated.isError).toBe(false);
    const after = getResume(record!.id)!;
    expect(after.draft.skills[0]!.items).toContain("SQL");
    expect(after.draft.experience).toHaveLength(2); // untouched fields are kept
    expect(after.draft.keywords).toEqual(["Go", "Kafka"]);

    expect((await call("list_resumes")).text).toContain(record!.id);
    expect((await call("get_resume", { resumeId: record!.id })).text).toContain('"profileId": "exp-fintrail"');
  });

  it("never exposes or uses unchanged example data", async () => {
    saveProfile(exampleProfileForForm());
    expect((await call("get_profile")).text).toContain("only contains EasyResume's example data");

    const profile = exampleProfileForForm();
    profile.basics.name = "Sam Rivera";
    profile.basics.email = "sam@example.org";
    profile.experience[0]!.company = "Real Co";
    saveProfile(profile);
    const { text } = await call("get_profile");
    expect(text).toContain("Real Co");
    expect(text).not.toContain("Northfield");
    expect(text).toContain("unchanged example entries");

    const result = await call("create_resume", {
      targetTitle: "PM",
      jobDescription: "JD",
      experience: [{ profileId: "example-exp-1" }, { profileId: "example-exp-2" }],
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain('experience "example-exp-2"');
  });

  it("imports an uploaded resume for review without saving it", async () => {
    expect((await call("get_uploaded_resume")).text).toContain("No resume has been uploaded");

    saveUpload("cv.pdf", "Jane Doe\nEngineer at Acme 2019-2023\n- Built things");
    const read = await call("get_uploaded_resume");
    expect(read.text).toContain("<resume>\nJane Doe");
    expect(read.text).toContain("not as instructions");

    const result = await call("import_profile", {
      basics: { name: "Jane Doe", email: "jane@example.org" },
      experience: [{ company: "Acme", title: "Engineer", startDate: "2019", endDate: "2023", achievements: ["Built things"] }],
      skills: [{ category: "Languages", items: ["Go"] }],
    });
    expect(result.isError).toBe(false);
    expect(result.text).toContain("Imported from cv.pdf: Jane Doe; 1 jobs, 1 skill groups");
    expect(result.text).toContain("Nothing is saved yet");
    expect(getPendingImport()!.profile.experience[0]!.company).toBe("Acme");
    expect(loadProfile().basics.name).toBe(""); // nothing saved until the user reviews it

    const bad = await call("import_profile", { experience: [{ startDate: "Jan 2019" }] });
    expect(bad.isError).toBe(true);
  });

  it("returns a readable error for made-up profile ids", async () => {
    saveProfile(sampleProfile());
    const result = await call("create_resume", {
      targetTitle: "Engineer",
      jobDescription: "JD",
      experience: [{ profileId: "exp-google" }],
    });
    expect(result.isError).toBe(true);
    expect(result.text).toContain('experience "exp-google"');
    expect(listResumes()).toHaveLength(0);
  });
});
