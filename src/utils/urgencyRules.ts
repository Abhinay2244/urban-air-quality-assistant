import { AQI_THRESHOLDS } from '../constants/aqi.ts';
import {
  type AQIData,
  type AssistantResponse,
  CommuteMode,
  HomeType,
  type Recommendation,
  RecommendationCategory,
  UrgencyLevel,
  type UserProfile,
} from '../types/index.ts';

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
  if (profile.hasRespiratoryCondition) groups.push('members with respiratory conditions');
  if (profile.hasChildren) groups.push('children');
  if (profile.hasElderly) groups.push('older adults');
  const audience = groups.length > 0 ? groups.join(', ') : 'all household members';

  return {
    title: 'Stay Indoors and Wear a Fitted N95 Mask for Essential Trips',
    category: RecommendationCategory.HEALTH_ALERT,
    action: `At AQI ${aqi}, keep ${audience} indoors with windows closed, run filtration, and wear a fitted N95/KF94 mask outside.`,
    impactExplanation:
      'Prevents acute PM2.5 inhalation spikes that trigger airway inflammation and flare-ups.',
    estimatedPM25Reduction: 70,
    urgency: UrgencyLevel.CRITICAL,
  };
}

function buildContextRecommendation(profile: UserProfile): Recommendation {
  if (profile.commuteMode === CommuteMode.WALK_OR_BIKE) {
    return {
      title: 'Pause Active Outdoor Commuting During Smog Peaks',
      category: RecommendationCategory.DAILY_ROUTINE,
      action:
        'Switch walking or cycling trips to enclosed transit or carpools during inversion hours.',
      impactExplanation:
        'Avoiding heavy outdoor breathing near traffic cuts inhaled PM2.5 dramatically.',
      estimatedPM25Reduction: 45,
      urgency: UrgencyLevel.HIGH,
    };
  }
  if (profile.homeType === HomeType.APARTMENT || profile.homeType === HomeType.SHARED_HOUSING) {
    return {
      title: 'Seal Shared Hallway and Window Drafts',
      category: RecommendationCategory.INDOOR_AIR,
      action:
        'Place door sweeps under corridor doors and minimize exhaust-fan runtime during smog peaks.',
      impactExplanation:
        'Reduces stack-effect infiltration of outdoor winter smog into compact living spaces.',
      estimatedPM25Reduction: 35,
      urgency: UrgencyLevel.HIGH,
    };
  }
  return {
    title: 'Replace Private Car Cold-Starts with Bundled Eco-Trips',
    category: RecommendationCategory.SUSTAINABLE_ALTERNATIVE,
    action:
      'Bundle errands into one mid-day trip, set cabin HVAC to recirculate, and avoid idling.',
    impactExplanation:
      'Eliminates high-emission cold-start exhaust and lowers in-cabin particle infiltration.',
    estimatedPM25Reduction: 30,
    urgency: UrgencyLevel.HIGH,
  };
}

function scoreUrgency(rec: Recommendation, profile: UserProfile, aqi: number): UrgencyLevel {
  const vulnerable = hasVulnerableMembers(profile);
  if (aqi >= AQI_THRESHOLDS.SEVERE) {
    return rec.category === RecommendationCategory.HEALTH_ALERT ||
      rec.category === RecommendationCategory.INDOOR_AIR
      ? UrgencyLevel.CRITICAL
      : UrgencyLevel.HIGH;
  }
  if (aqi >= AQI_THRESHOLDS.UNHEALTHY && vulnerable) {
    return rec.category === RecommendationCategory.HEALTH_ALERT
      ? UrgencyLevel.CRITICAL
      : UrgencyLevel.HIGH;
  }
  if (aqi >= AQI_THRESHOLDS.SENSITIVE && rec.category === RecommendationCategory.HEALTH_ALERT) {
    return UrgencyLevel.HIGH;
  }
  return rec.urgency ?? UrgencyLevel.STANDARD;
}

/**
 * Applies dynamic urgency, prioritization, and profile-specific protective rules
 * based on AQI severity, household vulnerabilities, commute mode, and home type.
 */
export function applyUrgencyRules(
  response: AssistantResponse,
  profile: UserProfile,
  aqiData: AQIData,
): AssistantResponse {
  const vulnerable = hasVulnerableMembers(profile);
  const severeOrSensitiveUnhealthy =
    aqiData.aqi >= AQI_THRESHOLDS.SEVERE ||
    (aqiData.aqi >= AQI_THRESHOLDS.UNHEALTHY && profile.hasRespiratoryCondition);

  const enriched: Recommendation[] = response.recommendations.map((rec) => ({
    ...rec,
    urgency: scoreUrgency(rec, profile, aqiData.aqi),
  }));

  const hasMaskAlert = enriched.some(
    (rec) =>
      rec.category === RecommendationCategory.HEALTH_ALERT &&
      rec.action.toLowerCase().includes('mask'),
  );

  if (severeOrSensitiveUnhealthy && !hasMaskAlert) {
    enriched.unshift(buildSevereAlertRecommendation(profile, aqiData.aqi));
  } else if (
    vulnerable &&
    enriched.every((rec) => rec.category !== RecommendationCategory.HEALTH_ALERT)
  ) {
    enriched.unshift(buildSevereAlertRecommendation(profile, aqiData.aqi));
  }

  const contextRule = buildContextRecommendation(profile);
  if (!enriched.some((rec) => rec.title === contextRule.title)) {
    enriched.push(contextRule);
  }

  enriched.sort(
    (a, b) =>
      URGENCY_RANK[b.urgency ?? UrgencyLevel.STANDARD] -
      URGENCY_RANK[a.urgency ?? UrgencyLevel.STANDARD],
  );

  const priorityGuidance = severeOrSensitiveUnhealthy
    ? `Stay indoors, seal living spaces, and use a fitted N95 mask for essential trips (AQI ${aqiData.aqi}).`
    : response.priorityGuidance;

  return { ...response, priorityGuidance, recommendations: enriched };
}
