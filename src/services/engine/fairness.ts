// Fairness Layer for Erode CEO Office Exam Duty Allotment System
// Ensures equitable distribution of exam duties across all eligible teachers

import { Teacher, DutyHistory } from '../../types';

export interface TeacherFairnessMetrics {
  teacherId: string;
  totalDutiesCount: number;
  lastDutyYear: number;
  recentDutiesCount: number; // in last 2-3 years
  fairnessPenaltyScore: number;
}

/**
 * Computes fairness metrics and penalty score for each teacher based on duty history.
 * Lower penalty score means higher priority for allotment (fewer recent duties).
 */
export function computeFairnessMetrics(
  teachers: Teacher[],
  history: DutyHistory[],
  currentYear: number = new Date().getFullYear()
): Map<string, TeacherFairnessMetrics> {
  const metricsMap = new Map<string, TeacherFairnessMetrics>();

  // Initialize for all teachers
  for (const teacher of teachers) {
    metricsMap.set(teacher.id, {
      teacherId: teacher.id,
      totalDutiesCount: 0,
      lastDutyYear: 0,
      recentDutiesCount: 0,
      fairnessPenaltyScore: 0,
    });
  }

  // Populate from duty history
  for (const record of history) {
    const metrics = metricsMap.get(record.teacherId);
    if (!metrics) continue;

    metrics.totalDutiesCount += 1;
    if (record.year > metrics.lastDutyYear) {
      metrics.lastDutyYear = record.year;
    }

    // Weight recent duties more heavily
    const yearsAgo = currentYear - record.year;
    if (yearsAgo <= 1) {
      metrics.recentDutiesCount += 3; // Duty in last year heavily penalizes
    } else if (yearsAgo === 2) {
      metrics.recentDutiesCount += 2; // Duty 2 years ago moderate penalty
    } else if (yearsAgo === 3) {
      metrics.recentDutiesCount += 1;
    }
  }

  // Compute final penalty score
  for (const metrics of metricsMap.values()) {
    // Penalty is higher if recent duties are high, or if last duty was recent
    let recencyWeight = 0;
    if (metrics.lastDutyYear === currentYear - 1) recencyWeight = 100;
    else if (metrics.lastDutyYear === currentYear - 2) recencyWeight = 40;
    else if (metrics.lastDutyYear === currentYear - 3) recencyWeight = 10;

    metrics.fairnessPenaltyScore = metrics.recentDutiesCount * 20 + metrics.totalDutiesCount * 5 + recencyWeight;
  }

  return metricsMap;
}

/**
 * Sorts eligible candidates fairly:
 * 1. Lowest fairness penalty score first (teachers who haven't served recently)
 * 2. Oldest 'lastDutyYear' first (never served or served long ago)
 * 3. Then by Seniority Rank ascending (if applicable) or stable tie-break
 */
export function sortTeachersByFairness(
  eligibleTeachers: Teacher[],
  fairnessMap: Map<string, TeacherFairnessMetrics>,
  considerSeniority: boolean = false
): Teacher[] {
  return [...eligibleTeachers].sort((a, b) => {
    const fa = fairnessMap.get(a.id) || { fairnessPenaltyScore: 0, lastDutyYear: 0 };
    const fb = fairnessMap.get(b.id) || { fairnessPenaltyScore: 0, lastDutyYear: 0 };

    // Primary: fairness penalty
    if (fa.fairnessPenaltyScore !== fb.fairnessPenaltyScore) {
      return fa.fairnessPenaltyScore - fb.fairnessPenaltyScore;
    }

    // Secondary: last duty year (0 or oldest year first)
    if (fa.lastDutyYear !== fb.lastDutyYear) {
      return fa.lastDutyYear - fb.lastDutyYear;
    }

    // Tertiary: Seniority rank if enabled
    if (considerSeniority && a.seniorityRank !== b.seniorityRank) {
      return a.seniorityRank - b.seniorityRank;
    }

    // Stable tie-break by name
    return a.name.localeCompare(b.name);
  });
}
