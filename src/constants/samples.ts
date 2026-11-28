/**
 * @module constants/samples
 * Responsibility: Provide sample household profiles for quick empty-state exploration.
 * Must not trigger network requests, validate inputs, or store mutable application state.
 */
import { CommuteMode, FamilyType, HomeType, type UserProfile } from '@shared/types/index.ts';

/** Sample household scenarios shown in the empty state to help users explore quickly. */
export const SAMPLE_SCENARIOS: readonly { label: string; profile: UserProfile }[] = [
  {
    label: 'Delhi · Parent with children',
    profile: {
      city: 'Delhi',
      familyType: FamilyType.NUCLEAR,
      hasChildren: true,
      hasElderly: false,
      hasRespiratoryCondition: false,
      commuteMode: CommuteMode.PUBLIC_TRANSIT,
      homeType: HomeType.APARTMENT,
    },
  },
  {
    label: 'Noida · Senior citizen',
    profile: {
      city: 'Noida',
      familyType: FamilyType.MULTI_GENERATIONAL,
      hasChildren: false,
      hasElderly: true,
      hasRespiratoryCondition: true,
      commuteMode: CommuteMode.CAR,
      homeType: HomeType.APARTMENT,
    },
  },
  {
    label: 'Mumbai · Working professional',
    profile: {
      city: 'Mumbai',
      familyType: FamilyType.WORKING_PROFESSIONAL,
      hasChildren: false,
      hasElderly: false,
      hasRespiratoryCondition: false,
      commuteMode: CommuteMode.PUBLIC_TRANSIT,
      homeType: HomeType.APARTMENT,
    },
  },
  {
    label: 'Kolkata · Student athlete',
    profile: {
      city: 'Kolkata',
      familyType: FamilyType.STUDENT,
      hasChildren: false,
      hasElderly: false,
      hasRespiratoryCondition: false,
      commuteMode: CommuteMode.WALK_OR_BIKE,
      homeType: HomeType.SHARED_HOUSING,
    },
  },
  {
    label: 'Lucknow · Family with asthma',
    profile: {
      city: 'Lucknow',
      familyType: FamilyType.MULTI_GENERATIONAL,
      hasChildren: true,
      hasElderly: true,
      hasRespiratoryCondition: true,
      commuteMode: CommuteMode.CAR,
      homeType: HomeType.DETACHED_HOUSE,
    },
  },
  {
    label: 'Hyderabad · Remote household',
    profile: {
      city: 'Hyderabad',
      familyType: FamilyType.SINGLE,
      hasChildren: false,
      hasElderly: false,
      hasRespiratoryCondition: false,
      commuteMode: CommuteMode.REMOTE,
      homeType: HomeType.APARTMENT,
    },
  },
];
