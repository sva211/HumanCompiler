import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type { Profile } from "../scripts/profile-manager.ts";
import {
  exportToOpenAI,
  exportToGemini,
  exportToMarkdown,
} from "../scripts/export-profile.ts";

const FIXTURE_PATH = join(
  import.meta.dirname!,
  "fixtures",
  "sample-profile.yaml"
);

let profile: Profile;

describe("Multi-LLM Profile Exporter", () => {
  it("loads the fixture profile", async () => {
    const content = await readFile(FIXTURE_PATH, "utf-8");
    profile = parse(content) as Profile;
    expect(profile.meta.name).toBe("Sarah Chen");
  });

  describe("OpenAI export", () => {
    it("generates a system prompt with persona instruction", () => {
      const out = exportToOpenAI(profile);
      expect(out).toContain("You are Sarah Chen");
      expect(out).toContain("Senior Product Manager");
    });

    it("includes communication style", () => {
      const out = exportToOpenAI(profile);
      expect(out).toContain("Communication");
      expect(out).toContain("Concise and structured");
    });

    it("includes decision-making framework", () => {
      const out = exportToOpenAI(profile);
      expect(out).toContain("Decision-Making");
      expect(out).toContain("Data-informed");
    });

    it("includes expertise domains", () => {
      const out = exportToOpenAI(profile);
      expect(out).toContain("Product analytics");
      expect(out).toContain("expert");
    });

    it("includes edge case handling", () => {
      const out = exportToOpenAI(profile);
      expect(out).toContain("Conflict resolution");
    });
  });

  describe("Gemini export", () => {
    it("uses XML-like structure tags", () => {
      const out = exportToGemini(profile);
      expect(out).toContain("<persona>");
      expect(out).toContain("</persona>");
      expect(out).toContain("<instructions>");
      expect(out).toContain("<behavioral_profile>");
      expect(out).toContain("<guidelines>");
    });

    it("includes name and role in persona block", () => {
      const out = exportToGemini(profile);
      expect(out).toContain("Name: Sarah Chen");
      expect(out).toContain("Role: Senior Product Manager");
    });
  });

  describe("Markdown export", () => {
    it("generates a formatted markdown document", () => {
      const out = exportToMarkdown(profile);
      expect(out).toContain("# Sarah Chen");
      expect(out).toContain("Behavioral Profile");
    });

    it("includes work patterns", () => {
      const out = exportToMarkdown(profile);
      expect(out).toContain("Work Patterns");
      expect(out).toContain("Notion");
    });

    it("includes confidence score", () => {
      const out = exportToMarkdown(profile);
      expect(out).toContain("Confidence");
      expect(out).toContain("0.88");
    });
  });
});
