/**
 * @module utils/urgencyRules
 * Responsibility: Enrich assistant recommendations with deterministic US-scale AQI and household urgency rules.
 * Must not invoke Gemini, fetch AQI data, or contain UI rendering logic.
 */
import { AQI_THRESHOLDS } from '@shared/constants/aqi.ts';
import {
  CONTEXT_RULE_TEMPLATES,
  SEVERE_ALERT_TEMPLATE,
  SEVERE_PRIORITY_TEMPLATE,
} from '../constants/urgencyTemplates.ts';
import {
  type AqiData,
  type AssistantResponse,
  CommuteMode,
  HomeType,
  type Recommendation,
  RecommendationCategory,
  UrgencyLevel,
  type UserProfile,
} from '@shared/types/index.ts';

const URGENCY_RANK: Record<UrgencyLevel, number> = {
  [UrgencyLevel.CRITICAL]: 3,
  [UrgencyLevel.HIGH]: 2,
  [UrgencyLevel.STANDARD]: 1,
};

function hasVulnerableMembers(profile: UserProfile): boolean {
  return profile.hasChildren || profile.hasElderly || profile.hasRespiratoryCondition;
}

function buildSevereAlertRecommendation(profile: UserProfile, aqi: number): Recommendation {
  const groups: string[] = [];
  if (profile.hasRespiratoryCondition) {
    groups.push(SEVERE_ALERT_TEMPLATE.AUDIENCE_RESPIRATORY);
  }
  if (profile.hasChildren) groups.push(SEVERE_ALERT_TEMPLATE.AUDIENCE_CHILDREN);
  if (profile.hasElderly) groups.push(SEVERE_ALERT_TEMPLATE.AUDIENCE_ELDERLY);
  const audience = groups.length > 0 ? groups.join(', ') : SEVERE_ALERT_TEMPLATE.DEFAULT_AUDIENCE;

  return {
    title: SEVERE_ALERT_TEMPLATE.TITLE,
    category: SEVERE_ALERT_TEMPLATE.CATEGORY,
    action: `At AQI ${aqi}, keep ${audience} indoors with windows closed, run filtration, and wear a fitted N95/KF94 mask outside.`,
    impactExplanation: SEVERE_ALERT_TEMPLATE.IMPACT_EXPLANATION,
    estimatedPM25Reduction: SEVERE_ALERT_TEMPLATE.ESTIMATED_PM25_REDUCTION,
    urgency: SEVERE_ALERT_TEMPLATE.URGENCY,
  };
}

function buildContextRecommendation(profile: UserProfile): Recommendation {
  if (profile.commuteMode === CommuteMode.WALK_OR_BIKE) {
    return { ...CONTEXT_RULE_TEMPLATES.WALK_OR_BIKE };
  }
  if (profile.homeType === HomeType.APARTMENT || profile.homeType === HomeType.SHARED_HOUSING) {
    return { ...CONTEXT_RULE_TEMPLATES.COMPACT_HOUSING };
  }
  return { ...CONTEXT_RULE_TEMPLATES.DEFAULT_ECO_TRIP };
}

function scoreUrgency(rec: Recommendation, profile: UserProfile, aqi: number): UrgencyLevel {
  const vulnerable = hasVulnerableMembers(profile);
  if (aqi >= AQI_THRESHOLDS.UNHEALTHY) {
    return rec.category === RecommendationCategory.HEALTH_ALERT ||
      rec.category === RecommendationCategory.INDOOR_AIR
      ? UrgencyLevel.CRITICAL
      : UrgencyLevel.HIGH;
  }
  if (aqi >= AQI_THRESHOLDS.UNHEALTHY_SENSITIVE && vulnerable) {
    return rec.category === RecommendationCategory.HEALTH_ALERT
      ? UrgencyLevel.CRITICAL
      : UrgencyLevel.HIGH;
  }
  if (aqi >= AQI_THRESHOLDS.MODERATE && rec.category === RecommendationCategory.HEALTH_ALERT) {
    return UrgencyLevel.HIGH;
  }
  return rec.urgency ?? UrgencyLevel.STANDARD;
}

/**
 * Applies dynamic urgency, prioritization, and profile-specific protective rules
 * based on US EPA AQI thresholds (101+ for sensitive households, 151+ for all households).
 */
export function applyUrgencyRules(
  response: AssistantResponse,
  profile: UserProfile,
  aqiData: AqiData,
): AssistantResponse {
  const vulnerable = hasVulnerableMembers(profile);
  // Why: On the US EPA AQI scale, 101+ (Unhealthy for Sensitive Groups) requires stay-indoors/N95
  // guidance for sensitive households, while 151+ (Unhealthy) triggers it for every household.
  const triggersSevereAlert =
    (aqiData.aqi >= AQI_THRESHOLDS.UNHEALTHY_SENSITIVE && vulnerable) ||
    aqiData.aqi >= AQI_THRESHOLDS.UNHEALTHY;

  const enriched: Recommendation[] = response.recommendations.map((rec) => ({
    ...rec,
    urgency: scoreUrgency(rec, profile, aqiData.aqi),
  }));

  const hasMaskAlert = enriched.some(
    (rec) =>
      rec.category === RecommendationCategory.HEALTH_ALERT &&
      rec.action.toLowerCase().includes(SEVERE_ALERT_TEMPLATE.MASK_KEYWORD),
  );

  if (
    (triggersSevereAlert && !hasMaskAlert) ||
    (vulnerable && enriched.every((rec) => rec.category !== RecommendationCategory.HEALTH_ALERT))
  ) {
    enriched.unshift(buildSevereAlertRecommendation(profile, aqiData.aqi));
  }

  const contextRule = buildContextRecommendation(profile);
  if (!enriched.some((rec) => rec.title === contextRule.title)) {
    enriched.push(contextRule);
  }

  // Why: Sort descending by deterministic severity rank so life-safety alerts always render first,
  // regardless of the order returned by the AI model.
  enriched.sort(
    (a, b) =>
      URGENCY_RANK[b.urgency ?? UrgencyLevel.STANDARD] -
      URGENCY_RANK[a.urgency ?? UrgencyLevel.STANDARD],
  );

  const priorityGuidance = triggersSevereAlert
    ? `${SEVERE_PRIORITY_TEMPLATE.PREFIX}${aqiData.aqi}${SEVERE_PRIORITY_TEMPLATE.SUFFIX}`
    : response.priorityGuidance;

  return { ...response, priorityGuidance, recommendations: enriched };
}
