#!/usr/bin/env bun
/**
 * Profile Analytics
 *
 * Generates insights and statistics from a compiled HumanCompiler profile.
 * Useful for understanding profile completeness, communication patterns,
 * and expertise coverage.
 *
 * Usage:
 *   bun run scripts/profile-analytics.ts <path-to-profile.yaml>
 */

import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { Profile } from "./profile-manager.ts";

export interface ProfileAnalytics {
  completeness: {
    score: number;
    totalSections: number;
    filledSections: number;
    missingSections: string[];
  };
  expertise: {
    totalDomains: number;
    expertLevel: number;
    advancedLevel: number;
    intermediateLevel: number;
    beginnerLevel: number;
    technicalSkillCount: number;
    topDomains: string[];
  };
  communication: {
    hasWritingStyle: boolean;
    hasToneSpectrum: boolean;
    patternCount: number;
    vocabularySize: number;
  };
  interview: {
    phasesCompleted: number;
    totalPhases: number;
    isComplete: boolean;
    confidenceScore: number | null;
    correctionsApplied: number;
  };
  artifacts: {
    documentsAnalyzed: number;
    patternsFound: number;
  };
}

export function analyzeProfile(profile: Profile): ProfileAnalytics {
  // Completeness analysis
  const allSections = [
    "identity",
    "communication",
    "decision_making",
    "expertise",
    "work_patterns",
    "edge_cases",
    "artifacts",
    "calibration",
  ] as const;

  const missingSections: string[] = [];
  let filledSections = 0;

  for (const section of allSections) {
    if (
      profile[section] &&
      Object.keys(profile[section] as object).length > 0
    ) {
      filledSections++;
    } else {
      missingSections.push(section);
    }
  }

  const completeness = {
    score: Math.round((filledSections / allSections.length) * 100),
    totalSections: allSections.length,
    filledSections,
    missingSections,
  };

  // Expertise analysis
  const domains = profile.expertise?.domains ?? [];
  const expertise = {
    totalDomains: domains.length,
    expertLevel: domains.filter((d) => d.depth === "expert").length,
    advancedLevel: domains.filter((d) => d.depth === "advanced").length,
    intermediateLevel: domains.filter((d) => d.depth === "intermediate").length,
    beginnerLevel: domains.filter((d) => d.depth === "beginner").length,
    technicalSkillCount: profile.expertise?.technical_skills?.length ?? 0,
    topDomains: domains
      .filter((d) => d.depth === "expert" || d.depth === "advanced")
      .map((d) => d.name),
  };

  // Communication analysis
  const communication = {
    hasWritingStyle: !!profile.communication?.writing_style,
    hasToneSpectrum: !!(
      profile.communication?.tone_spectrum?.formal ||
      profile.communication?.tone_spectrum?.casual
    ),
    patternCount: profile.communication?.patterns?.length ?? 0,
    vocabularySize: profile.communication?.vocabulary?.length ?? 0,
  };

  // Interview progress
  const interview = {
    phasesCompleted: profile.meta.phases_completed.length,
    totalPhases: 8,
    isComplete: profile.meta.status === "complete",
    confidenceScore: profile.calibration?.confidence_score ?? null,
    correctionsApplied: profile.calibration?.corrections?.length ?? 0,
  };

  // Artifacts
  const artifacts = {
    documentsAnalyzed: profile.artifacts?.analyzed_documents?.length ?? 0,
    patternsFound: profile.artifacts?.synthesized_patterns?.length ?? 0,
  };

  return {
    completeness,
    expertise,
    communication,
    interview,
    artifacts,
  };
}

export function formatAnalytics(
  profile: Profile,
  analytics: ProfileAnalytics
): string {
  const lines: string[] = [];
  const name = profile.meta.name;

  lines.push(`\n  Profile Analytics: ${name}`);
  lines.push("  " + "=".repeat(40));

  // Completeness
  lines.push(`\n  Completeness: ${analytics.completeness.score}%`);
  const filled = analytics.completeness.filledSections;
  const total = analytics.completeness.totalSections;
  const bar =
    "[" +
    "#".repeat(Math.round((filled / total) * 20)) +
    ".".repeat(20 - Math.round((filled / total) * 20)) +
    "]";
  lines.push(`  ${bar} ${filled}/${total} sections`);
  if (analytics.completeness.missingSections.length > 0) {
    lines.push(
      `  Missing: ${analytics.completeness.missingSections.join(", ")}`
    );
  }

  // Interview
  lines.push(
    `\n  Interview: ${analytics.interview.phasesCompleted}/${analytics.interview.totalPhases} phases`
  );
  lines.push(
    `  Status: ${analytics.interview.isComplete ? "Complete" : "In Progress"}`
  );
  if (analytics.interview.confidenceScore !== null) {
    lines.push(
      `  Confidence: ${analytics.interview.confidenceScore}/10`
    );
  }
  if (analytics.interview.correctionsApplied > 0) {
    lines.push(
      `  Corrections: ${analytics.interview.correctionsApplied} applied`
    );
  }

  // Expertise
  lines.push(`\n  Expertise: ${analytics.expertise.totalDomains} domains`);
  if (analytics.expertise.expertLevel > 0) {
    lines.push(`    Expert: ${analytics.expertise.expertLevel}`);
  }
  if (analytics.expertise.advancedLevel > 0) {
    lines.push(`    Advanced: ${analytics.expertise.advancedLevel}`);
  }
  if (analytics.expertise.intermediateLevel > 0) {
    lines.push(`    Intermediate: ${analytics.expertise.intermediateLevel}`);
  }
  if (analytics.expertise.topDomains.length > 0) {
    lines.push(
      `  Top domains: ${analytics.expertise.topDomains.join(", ")}`
    );
  }
  lines.push(
    `  Technical skills: ${analytics.expertise.technicalSkillCount}`
  );

  // Communication
  lines.push(`\n  Communication Profile:`);
  lines.push(
    `    Writing style: ${analytics.communication.hasWritingStyle ? "Captured" : "Missing"}`
  );
  lines.push(
    `    Tone spectrum: ${analytics.communication.hasToneSpectrum ? "Captured" : "Missing"}`
  );
  lines.push(`    Patterns: ${analytics.communication.patternCount}`);
  lines.push(`    Vocabulary: ${analytics.communication.vocabularySize} terms`);

  // Artifacts
  if (analytics.artifacts.documentsAnalyzed > 0) {
    lines.push(
      `\n  Artifacts: ${analytics.artifacts.documentsAnalyzed} documents analyzed`
    );
    lines.push(
      `  Synthesized patterns: ${analytics.artifacts.patternsFound}`
    );
  }

  return lines.join("\n");
}

// CLI entry point
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("profile-analytics.ts")
) {
  const profilePath = process.argv[2];

  if (!profilePath) {
    console.error(
      "Usage: bun run scripts/profile-analytics.ts <path-to-profile.yaml>"
    );
    process.exit(1);
  }

  readFile(profilePath, "utf-8")
    .then((content) => {
      const profile = parse(content) as Profile;
      const analytics = analyzeProfile(profile);
      console.log(formatAnalytics(profile, analytics));
    })
    .catch((err) => {
      console.error(`Analysis failed: ${err.message}`);
      process.exit(1);
    });
}
