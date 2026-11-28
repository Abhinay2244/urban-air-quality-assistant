import type { ReactElement } from 'react';
import { AppFooter, AppHeader, HeroSection, SkipToMainLink } from './components/AppChrome.tsx';
import { ErrorBanner } from './components/ErrorBanner.tsx';
import { RecommendationList } from './features/assistant/RecommendationList.tsx';
import { ImpactSummary } from './features/impact/ImpactSummary.tsx';
import { ProfileForm } from './features/profile/ProfileForm.tsx';
import { useAppWorkspace } from './hooks/useAppWorkspace.ts';

/** Root application shell composing skip link, header, hero, two-column workspace, and footer. */
export default function App(): ReactElement {
  const ws = useAppWorkspace();

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors duration-150 dark:bg-slate-950 dark:text-slate-100">
      <SkipToMainLink />
      <AppHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6"
      >
        <HeroSection />

        <ErrorBanner
          error={ws.activeError}
          {...(ws.canRetry
            ? {
                onRetry: () => {
                  void ws.retryLastRequest();
                },
              }
            : {})}
          onDismiss={ws.handleDismissError}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <ProfileForm
              profile={ws.profile}
              fieldErrors={ws.fieldErrors}
              isLoading={ws.isLoading}
              cooldownSeconds={ws.cooldownSeconds}
              cooldownNotice={ws.cooldownNotice}
              onFieldChange={ws.handleFieldChange}
              onSelectCityResult={ws.handleSelectCityResult}
              onSubmit={ws.handleSubmit}
            />
          </div>

          <div aria-busy={ws.isLoading} className="space-y-6 lg:sticky lg:top-6 lg:col-span-7">
            <ImpactSummary
              aqiData={ws.aqiData}
              response={ws.assistantResponse}
              isAqiUnavailable={ws.isAqiUnavailable}
              isLoading={ws.isLoading}
              onEnableManualAqi={ws.enableManualAqi}
              onSubmitManualAqi={ws.handleManualAqiSubmit}
            />
            <RecommendationList
              response={ws.assistantResponse}
              profile={ws.profile}
              aqiData={ws.aqiData}
              isLoading={ws.isLoading}
              resultsHeadingRef={ws.resultsHeadingRef}
              onSelectSample={ws.handleSelectSample}
            />
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
