/**
 * @module constants/samples
 * Responsibility: Provide sample household profiles for quick empty-state exploration.
 * Must not trigger network requests, validate inputs, or store mutable application state.
 */
import { CommuteMode, FamilyType, HomeType, type UserProfile } from '../types/index.ts';

/**
 * Sample household scenarios shown in the empty state to help users explore quickly.
 */
export const SAMPLE_SCENARIOS: ReadonlyArray<{ label: string; profile: UserProfile }> = [
  {
    label: 'New Delhi · Family with children',
    profile: {
      city: 'New Delhi',
      familyType: FamilyType.NUCLEAR,
      hasChildren: true,
      hasElderly: false,
      hasRespiratoryCondition: false,
      commuteMode: CommuteMode.PUBLIC_TRANSIT,
      homeType: HomeType.APARTMENT,
    },
  },
  {
    label: 'Lahore · Asthma sensitivity',
    profile: {
      city: 'Lahore',
      familyType: FamilyType.MULTI_GENERATIONAL,
      hasChildren: true,
      hasElderly: true,
      hasRespiratoryCondition: true,
      commuteMode: CommuteMode.CAR,
      homeType: HomeType.DETACHED_HOUSE,
    },
  },
  {
    label: 'Beijing · Cycling commuter',
    profile: {
      city: 'Beijing',
      familyType: FamilyType.COUPLE,
      hasChildren: false,
      hasElderly: false,
      hasRespiratoryCondition: false,
      commuteMode: CommuteMode.WALK_OR_BIKE,
      homeType: HomeType.APARTMENT,
    },
  },
];
