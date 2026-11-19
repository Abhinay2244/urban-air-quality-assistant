import type { ReactElement } from 'react';
import { ErrorBanner } from './components/ErrorBanner.tsx';
import { LogoMarkIcon } from './components/Icons.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import { APP_TEXT } from './constants/config.ts';
import { UI_COPY } from './constants/uiTheme.ts';
import { RecommendationList } from './features/assistant/RecommendationList.tsx';
import { ImpactSummary } from './features/impact/ImpactSummary.tsx';
import { ProfileForm } from './features/profile/ProfileForm.tsx';
import { useAssistant } from './hooks/useAssistant.ts';
import { useProfile } from './hooks/useProfile.ts';
import type { UserProfile } from './types/index.ts';

/**
 * Root application shell composing header, hero, responsive two-column workspace, and footer.
 */
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
    requestRecommendationsWithManualAqi,
    enableManualAqi,
    retryLastRequest,
    clearError,
  } = useAssistant();

  const handleSubmit = (): void => {
    const validProfile = validateProfile();
    if (validProfile) {
      void requestRecommendations(validProfile);
    }
  };

  const handleManualAqiSubmit = (aqi: number, pm25?: number): void => {
    const validProfile = validateProfile();
    if (validProfile) {
      void requestRecommendationsWithManualAqi(validProfile, aqi, pm25);
    }
  };

  const handleSelectSample = (sampleProfile: UserProfile): void => {
    const validProfile = replaceProfile(sampleProfile);
    if (validProfile) {
      void requestRecommendations(validProfile);
    }
  };

  const activeError = validationError ?? error;
  const canRetry = !validationError && Boolean(error);
  const handleDismissError = (): void => {
    clearValidationError();
    clearError();
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMarkIcon className="h-9 w-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                {APP_TEXT.APP_TITLE}
              </p>
              <p className="truncate text-sm text-teal-800 dark:text-teal-300">{UI_COPY.TAGLINE}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <section className="max-w-3xl space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-slate-50">
            {UI_COPY.HERO_HEADLINE}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">{UI_COPY.HERO_SUBTITLE}</p>
        </section>

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
              onFieldChange={updateField}
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

      <footer className="border-t border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl space-y-1.5 px-4 py-6 text-sm text-slate-600 sm:px-6 dark:text-slate-400">
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {UI_COPY.DATA_SOURCES} · {UI_COPY.DISCLAIMER}
          </p>
          <p>{APP_TEXT.FOOTER_NOTE}</p>
        </div>
      </footer>
    </div>
  );
}
