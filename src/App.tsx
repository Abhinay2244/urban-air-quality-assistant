import { type ReactElement, useState } from 'react';
import { AppFooter, AppHeader, HeroSection } from './components/AppChrome.tsx';
import { ErrorBanner } from './components/ErrorBanner.tsx';
import { RecommendationList } from './features/assistant/RecommendationList.tsx';
import { ImpactSummary } from './features/impact/ImpactSummary.tsx';
import { ProfileForm } from './features/profile/ProfileForm.tsx';
import { useAssistant } from './hooks/useAssistant.ts';
import { useProfile } from './hooks/useProfile.ts';
import type { CitySearchResult, Coordinates, UserProfile } from './types/index.ts';

/** Root application shell composing header, hero, responsive two-column workspace, and footer. */
export default function App(): ReactElement {
  const {
    profile,
    validationError,
    fieldErrors,
    updateField,
    replaceProfile,
    validateProfile,
    clearValidationError,
  } = useProfile();
  const {
    aqiData,
    assistantResponse,
    isLoading,
    isAqiUnavailable,
    cooldownSeconds,
    cooldownNotice,
    error,
    requestRecommendations,
    requestRecommendationsByLocation,
    requestRecommendationsWithManualAqi,
    enableManualAqi,
    retryLastRequest,
    clearError,
  } = useAssistant();
  const [selectedCoords, setSelectedCoords] = useState<{
    city: string;
    coords: Coordinates;
  } | null>(null);

  const handleFieldChange = <K extends keyof UserProfile>(
    field: K,
    value: UserProfile[K],
  ): void => {
    if (field === 'city') setSelectedCoords(null);
    updateField(field, value);
  };

  const handleSelectCityResult = (item: CitySearchResult): void => {
    setSelectedCoords({
      city: item.name,
      coords: { latitude: item.latitude, longitude: item.longitude },
    });
  };

  const handleUseCurrentLocation = (coords: Coordinates): void => {
    setSelectedCoords(null);
    clearValidationError();
    void requestRecommendationsByLocation(profile, coords);
  };

  const handleSubmit = (): void => {
    const validProfile = validateProfile();
    if (!validProfile) return;
    const coords =
      selectedCoords && selectedCoords.city === validProfile.city
        ? selectedCoords.coords
        : undefined;
    void requestRecommendations(validProfile, coords);
  };

  const handleManualAqiSubmit = (aqi: number, pm25?: number, pm10?: number): void => {
    const validProfile = validateProfile();
    if (validProfile) void requestRecommendationsWithManualAqi(validProfile, aqi, pm25, pm10);
  };

  const handleSelectSample = (sampleProfile: UserProfile): void => {
    setSelectedCoords(null);
    const validProfile = replaceProfile(sampleProfile);
    if (validProfile) void requestRecommendations(validProfile);
  };

  const activeError = validationError ?? error;
  const canRetry = !validationError && Boolean(error);
  const handleDismissError = (): void => {
    clearValidationError();
    clearError();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-slate-950 dark:text-slate-100">
      <AppHeader />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <HeroSection />

        <ErrorBanner
          error={activeError}
          onRetry={canRetry ? () => void retryLastRequest() : undefined}
          onDismiss={handleDismissError}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <ProfileForm
              profile={profile}
              fieldErrors={fieldErrors}
              isLoading={isLoading}
              cooldownSeconds={cooldownSeconds}
              cooldownNotice={cooldownNotice}
              onFieldChange={handleFieldChange}
              onSelectCityResult={handleSelectCityResult}
              onUseCurrentLocation={handleUseCurrentLocation}
              onSubmit={handleSubmit}
            />
          </div>

          <div
            aria-live="polite"
            aria-busy={isLoading}
            className="space-y-6 lg:sticky lg:top-6 lg:col-span-7"
          >
            <ImpactSummary
              aqiData={aqiData}
              response={assistantResponse}
              isAqiUnavailable={isAqiUnavailable}
              isLoading={isLoading}
              onEnableManualAqi={enableManualAqi}
              onSubmitManualAqi={handleManualAqiSubmit}
            />
            <RecommendationList
              response={assistantResponse}
              profile={profile}
              aqiData={aqiData}
              isLoading={isLoading}
              onSelectSample={handleSelectSample}
            />
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
