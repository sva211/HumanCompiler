#!/usr/bin/env bun
/**
 * Multi-LLM Profile Exporter
 *
 * Exports a compiled HumanCompiler profile to system prompts for
 * different LLM providers: OpenAI (GPT-4.1 / o3), Google (Gemini 2.5),
 * and a portable Markdown format.
 *
 * Usage:
 *   bun run scripts/export-profile.ts <profile-path> [--format openai|gemini|markdown|all]
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { parse } from "yaml";
import type { Profile } from "./profile-manager.ts";

type ExportFormat = "openai" | "gemini" | "markdown" | "all";

function buildCorePersona(profile: Profile): string {
  const sections: string[] = [];
  const name = profile.meta.name;

  // Identity
  if (profile.identity) {
    const id = profile.identity;
    const parts = [`You are ${name}`];
    if (id.role) parts[0] += `, ${id.role}`;
    if (id.organization) parts[0] += ` at ${id.organization}`;
    parts[0] += ".";
    if (id.responsibilities?.length) {
      parts.push(
        `Your key responsibilities: ${id.responsibilities.join(", ")}.`
      );
    }
    if (id.goals?.length) {
      parts.push(`Your current goals: ${id.goals.join(", ")}.`);
    }
    sections.push(parts.join(" "));
  }

  // Communication style
  if (profile.communication) {
    const comm = profile.communication;
    const parts: string[] = [];
    if (comm.writing_style) {
      parts.push(`Writing style: ${comm.writing_style}`);
    }
    if (comm.tone_spectrum) {
      if (comm.tone_spectrum.formal) {
        parts.push(`In formal contexts: ${comm.tone_spectrum.formal}`);
      }
      if (comm.tone_spectrum.casual) {
        parts.push(`In casual contexts: ${comm.tone_spectrum.casual}`);
      }
    }
    if (comm.patterns?.length) {
      parts.push(
        `Communication patterns: ${comm.patterns.join("; ")}`
      );
    }
    if (comm.vocabulary?.length) {
      parts.push(
        `Characteristic vocabulary: ${comm.vocabulary.join(", ")}`
      );
    }
    if (parts.length) {
      sections.push("## Communication\n" + parts.join("\n"));
    }
  }

  // Decision making
  if (profile.decision_making) {
    const dm = profile.decision_making;
    const parts: string[] = [];
    if (dm.framework) parts.push(`Decision framework: ${dm.framework}`);
    if (dm.prioritization)
      parts.push(`Prioritization approach: ${dm.prioritization}`);
    if (dm.under_uncertainty)
      parts.push(`Under uncertainty: ${dm.under_uncertainty}`);
    if (dm.tradeoff_patterns?.length) {
      parts.push(
        `Tradeoff patterns: ${dm.tradeoff_patterns.join("; ")}`
      );
    }
    if (parts.length) {
      sections.push("## Decision-Making\n" + parts.join("\n"));
    }
  }

  // Expertise
  if (profile.expertise) {
    const exp = profile.expertise;
    const parts: string[] = [];
    if (exp.domains?.length) {
      const domainList = exp.domains
        .map((d) => `${d.name} (${d.depth}): ${d.details}`)
        .join("\n- ");
      parts.push(`Expertise domains:\n- ${domainList}`);
    }
    if (exp.technical_skills?.length) {
      parts.push(`Technical skills: ${exp.technical_skills.join(", ")}`);
    }
    if (parts.length) {
      sections.push("## Expertise\n" + parts.join("\n"));
    }
  }

  // Edge cases
  if (profile.edge_cases) {
    const ec = profile.edge_cases;
    const parts: string[] = [];
    if (ec.conflict_resolution)
      parts.push(`Conflict resolution: ${ec.conflict_resolution}`);
    if (ec.ambiguity_handling)
      parts.push(`Ambiguity handling: ${ec.ambiguity_handling}`);
    if (ec.failure_response)
      parts.push(`Failure response: ${ec.failure_response}`);
    if (parts.length) {
      sections.push("## Edge Cases & Difficult Situations\n" + parts.join("\n"));
    }
  }

  return sections.join("\n\n");
}

export function exportToOpenAI(profile: Profile): string {
  const persona = buildCorePersona(profile);
  const name = profile.meta.name;
  // Designed for OpenAI's system message format (GPT-4.1, o3, o4-mini).
  // Uses direct, structured instructions that work well with OpenAI's
  // instruction-following behavior.
  return `You are ${name}. Not an impression — the real deal. Think the way ${name} thinks, write the way ${name} writes, decide the way ${name} decides.

${persona}

Stay grounded in the profile above. If a question falls outside what ${name} would know, say so honestly rather than guessing. Match the tone to the context — formal when the situation calls for it, casual when it doesn't.`;
}

export function exportToGemini(profile: Profile): string {
  const persona = buildCorePersona(profile);
  const name = profile.meta.name;
  // Designed for Google's Gemini system instruction format (Gemini 2.5 Pro/Flash).
  // Uses XML-style sections which Gemini handles well for structured persona prompts.
  return `<persona>
Name: ${name}
${profile.identity?.role ? `Role: ${profile.identity.role}` : ""}
${profile.identity?.organization ? `Organization: ${profile.identity.organization}` : ""}
</persona>

<instructions>
You are ${name}. Think, write, and make decisions exactly as ${name} would. Draw on the behavioral profile below — it was built from real interviews and work artifacts, so treat it as ground truth.
</instructions>

<behavioral_profile>
${persona}
</behavioral_profile>

<guidelines>
- Write in ${name}'s natural voice — use their vocabulary, sentence structure, and patterns
- Apply their decision-making framework when weighing options or giving advice
- When something is ambiguous or outside ${name}'s expertise, handle it the way they would — don't default to generic responses
- Match the level of formality to the context
</guidelines>`;
}

export function exportToMarkdown(profile: Profile): string {
  const persona = buildCorePersona(profile);
  const name = profile.meta.name;

  let md = `# ${name} — Behavioral Profile\n\n`;
  md += `*Compiled on ${profile.meta.last_updated?.split("T")[0] ?? "unknown"}*\n\n`;
  md += `---\n\n`;
  md += persona;

  if (profile.work_patterns) {
    const wp = profile.work_patterns;
    const parts: string[] = [];
    if (wp.daily_routine) parts.push(`Daily routine: ${wp.daily_routine}`);
    if (wp.tools?.length) parts.push(`Tools: ${wp.tools.join(", ")}`);
    if (wp.collaboration_style)
      parts.push(`Collaboration: ${wp.collaboration_style}`);
    if (wp.meeting_behavior) parts.push(`Meetings: ${wp.meeting_behavior}`);
    if (parts.length) {
      md += "\n\n## Work Patterns\n" + parts.join("\n");
    }
  }

  if (profile.calibration) {
    const cal = profile.calibration;
    if (cal.confidence_score !== undefined) {
      md += `\n\n## Profile Confidence\n`;
      md += `Score: ${cal.confidence_score}/10\n`;
    }
    if (cal.corrections?.length) {
      md += `\nCorrections applied: ${cal.corrections.join("; ")}`;
    }
  }

  return md;
}

export async function exportProfile(
  profilePath: string,
  format: ExportFormat = "all"
): Promise<Record<string, string>> {
  const content = await readFile(profilePath, "utf-8");
  const profile = parse(content) as Profile;
  const outDir = join(dirname(profilePath), "exports");
  await mkdir(outDir, { recursive: true });

  const results: Record<string, string> = {};
  const slug = profile.meta.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (format === "openai" || format === "all") {
    const out = exportToOpenAI(profile);
    const path = join(outDir, `${slug}-openai-system-prompt.txt`);
    await writeFile(path, out, "utf-8");
    results.openai = path;
  }

  if (format === "gemini" || format === "all") {
    const out = exportToGemini(profile);
    const path = join(outDir, `${slug}-gemini-system-instruction.txt`);
    await writeFile(path, out, "utf-8");
    results.gemini = path;
  }

  if (format === "markdown" || format === "all") {
    const out = exportToMarkdown(profile);
    const path = join(outDir, `${slug}-profile.md`);
    await writeFile(path, out, "utf-8");
    results.markdown = path;
  }

  return results;
}

// CLI entry point
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("export-profile.ts")
) {
  const profilePath = process.argv[2];
  const format = (process.argv[3]?.replace("--format=", "").replace("--format", "") ||
                  process.argv[4] || "all") as ExportFormat;

  if (!profilePath) {
    console.error(
      "Usage: bun run scripts/export-profile.ts <path-to-profile.yaml> [--format openai|gemini|markdown|all]"
    );
    process.exit(1);
  }

  exportProfile(profilePath, format)
    .then((results) => {
      console.log("Profile exported successfully!");
      for (const [fmt, path] of Object.entries(results)) {
        console.log(`  ${fmt}: ${path}`);
      }
    })
    .catch((err) => {
      console.error(`Export failed: ${err.message}`);
      process.exit(1);
    });
}
