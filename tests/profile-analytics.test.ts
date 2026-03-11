import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import type { Profile } from "../scripts/profile-manager.ts";
import {
  analyzeProfile,
  formatAnalytics,
} from "../scripts/profile-analytics.ts";

const FIXTURE_PATH = join(
  import.meta.dirname!,
  "fixtures",
  "sample-profile.yaml"
);

let profile: Profile;

describe("Profile Analytics", () => {
  it("loads the fixture profile", async () => {
    const content = await readFile(FIXTURE_PATH, "utf-8");
    profile = parse(content) as Profile;
    expect(profile.meta.name).toBe("Sarah Chen");
  });

  describe("completeness scoring", () => {
    it("calculates completeness percentage", () => {
      const analytics = analyzeProfile(profile);
      expect(analytics.completeness.score).toBe(100);
      expect(analytics.completeness.filledSections).toBe(8);
      expect(analytics.completeness.totalSections).toBe(8);
    });

    it("identifies missing sections", () => {
      const partial: Profile = {
        meta: {
          name: "Test",
          started: "2026-01-01",
          last_updated: "2026-01-01",
          current_phase: 3,
          phases_completed: [1, 2],
          status: "in_progress",
        },
        identity: { role: "Dev" },
        communication: { writing_style: "Direct" },
      };
      const analytics = analyzeProfile(partial);
      expect(analytics.completeness.score).toBe(25);
      expect(analytics.completeness.missingSections).toContain(
        "decision_making"
      );
      expect(analytics.completeness.missingSections).toContain("expertise");
    });
  });

  describe("expertise analysis", () => {
    it("counts domain expertise levels", () => {
      const analytics = analyzeProfile(profile);
      expect(analytics.expertise.totalDomains).toBe(4);
      expect(analytics.expertise.expertLevel).toBe(1);
      expect(analytics.expertise.advancedLevel).toBe(2);
    });

    it("identifies top domains", () => {
      const analytics = analyzeProfile(profile);
      expect(analytics.expertise.topDomains).toContain("Product analytics");
      expect(analytics.expertise.topDomains).toContain(
        "Platform API design"
      );
    });

    it("counts technical skills", () => {
      const analytics = analyzeProfile(profile);
      expect(analytics.expertise.technicalSkillCount).toBe(5);
    });
  });

  describe("interview progress", () => {
    it("tracks phases completed", () => {
      const analytics = analyzeProfile(profile);
      expect(analytics.interview.phasesCompleted).toBe(8);
      expect(analytics.interview.totalPhases).toBe(8);
      expect(analytics.interview.isComplete).toBe(true);
    });

    it("includes confidence score", () => {
      const analytics = analyzeProfile(profile);
      expect(analytics.interview.confidenceScore).toBe(0.88);
    });

    it("counts corrections applied", () => {
      const analytics = analyzeProfile(profile);
      expect(analytics.interview.correctionsApplied).toBe(3);
    });
  });

  describe("formatting", () => {
    it("produces readable output", () => {
      const analytics = analyzeProfile(profile);
      const output = formatAnalytics(profile, analytics);
      expect(output).toContain("Sarah Chen");
      expect(output).toContain("100%");
      expect(output).toContain("8/8 phases");
      expect(output).toContain("Complete");
    });
  });
});
