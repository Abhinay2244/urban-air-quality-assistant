import { type RefObject, useState } from 'react';
import type {
  AppError,
  AqiData,
  AssistantResponse,
  CitySearchResult,
  Coordinates,
  UserProfile,
} from '@shared/types/index.ts';
import { useAssistant } from './useAssistant.ts';
import { type ProfileFieldErrors, useProfile } from './useProfile.ts';
import { useResultsHeadingFocus } from './useResultsHeadingFocus.ts';

/** Combined workspace state and event handlers consumed by App. */
export interface AppWorkspaceState {
  profile: UserProfile;
  fieldErrors: ProfileFieldErrors;
  aqiData: AqiData | null;
  assistantResponse: AssistantResponse | null;
  isLoading: boolean;
  isAqiUnavailable: boolean;
  cooldownSeconds: number;
  cooldownNotice: string | null;
  activeError: AppError | null;
  canRetry: boolean;
  resultsHeadingRef: RefObject<HTMLHeadingElement | null>;
  handleFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  handleSelectCityResult: (item: CitySearchResult) => void;
  handleSubmit: () => void;
  handleManualAqiSubmit: (aqi: number, pm25?: number, pm10?: number) => void;
  handleSelectSample: (sampleProfile: UserProfile) => void;
  handleDismissError: () => void;
  enableManualAqi: () => void;
  retryLastRequest: () => Promise<void>;
}

function createWorkspaceHandlers(params: {
  profileState: ReturnType<typeof useProfile>;
  assistant: ReturnType<typeof useAssistant>;
  selectedCoords: { city: string; coords: Coordinates } | null;
  setSelectedCoords: (next: { city: string; coords: Coordinates } | null) => void;
}): Pick<
  AppWorkspaceState,
  | 'handleFieldChange'
  | 'handleSelectCityResult'
  | 'handleSubmit'
  | 'handleManualAqiSubmit'
  | 'handleSelectSample'
  | 'handleDismissError'
> {
  const { profileState, assistant, selectedCoords, setSelectedCoords } = params;
  return {
    handleFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]): void => {
      if (field === 'city') setSelectedCoords(null);
      profileState.updateField(field, value);
    },
    handleSelectCityResult: (item: CitySearchResult): void => {
      setSelectedCoords({
        city: item.name,
        coords: { latitude: item.latitude, longitude: item.longitude },
      });
    },
    handleSubmit: (): void => {
      const validProfile = profileState.validateProfile();
      if (!validProfile) return;
      const coords = selectedCoords?.city === validProfile.city ? selectedCoords.coords : undefined;
      void assistant.requestRecommendations(validProfile, coords);
    },
    handleManualAqiSubmit: (aqi: number, pm25?: number, pm10?: number): void => {
      const validProfile = profileState.validateProfile();
      if (validProfile) {
        void assistant.requestRecommendationsWithManualAqi(validProfile, aqi, pm25, pm10);
      }
    },
    handleSelectSample: (sampleProfile: UserProfile): void => {
      setSelectedCoords(null);
      const validProfile = profileState.replaceProfile(sampleProfile);
      if (validProfile) void assistant.requestRecommendations(validProfile);
    },
    handleDismissError: (): void => {
      profileState.clearValidationError();
      assistant.clearError();
    },
  };
}

/** Coordinates household profile state, selected city coordinates, and AQI/AI request lifecycle. */
export function useAppWorkspace(): AppWorkspaceState {
  const profileState = useProfile();
  const assistant = useAssistant();
  const [selectedCoords, setSelectedCoords] = useState<{
    city: string;
    coords: Coordinates;
  } | null>(null);
  const resultsHeadingRef = useResultsHeadingFocus(
    assistant.isLoading,
    assistant.assistantResponse,
  );
  const handlers = createWorkspaceHandlers({
    profileState,
    assistant,
    selectedCoords,
    setSelectedCoords,
  });

  return {
    profile: profileState.profile,
    fieldErrors: profileState.fieldErrors,
    aqiData: assistant.aqiData,
    assistantResponse: assistant.assistantResponse,
    isLoading: assistant.isLoading,
    isAqiUnavailable: assistant.isAqiUnavailable,
    cooldownSeconds: assistant.cooldownSeconds,
    cooldownNotice: assistant.cooldownNotice,
    activeError: profileState.validationError ?? assistant.error,
    canRetry: !profileState.validationError && Boolean(assistant.error),
    resultsHeadingRef,
    ...handlers,
    enableManualAqi: assistant.enableManualAqi,
    retryLastRequest: assistant.retryLastRequest,
  };
}
