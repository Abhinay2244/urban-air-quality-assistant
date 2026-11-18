import type { ReactElement } from 'react';
import { ErrorBanner } from './components/ErrorBanner.tsx';
import { APP_TEXT } from './constants/config.ts';
import { RecommendationList } from './features/assistant/RecommendationList.tsx';
import { ImpactSummary } from './features/impact/ImpactSummary.tsx';
import { ProfileForm } from './features/profile/ProfileForm.tsx';
import { useAssistant } from './hooks/useAssistant.ts';
import { useProfile } from './hooks/useProfile.ts';

/**
 * Root application component composing profile, live impact, and assistant features.
 */
export default function App(): ReactElement {
  const { profile, validationError, updateField, validateProfile } = useProfile();
  const { aqiData, assistantResponse, isLoading, error, generatePlan, clearError } = useAssistant();

  const handleSubmit = (): void => {
    const validProfile = validateProfile();
    if (validProfile) {
      void generatePlan(validProfile);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{APP_TEXT.APP_TITLE}</h1>
        <p className="text-sm text-slate-600">{APP_TEXT.APP_SUBTITLE}</p>
      </header>

      <ErrorBanner error={validationError ?? error} onDismiss={clearError} />

      <ProfileForm
        profile={profile}
        isLoading={isLoading}
        onFieldChange={updateField}
        onSubmit={handleSubmit}
      />

      <ImpactSummary aqiData={aqiData} response={assistantResponse} />

      <RecommendationList response={assistantResponse} />
    </main>
  );
}
