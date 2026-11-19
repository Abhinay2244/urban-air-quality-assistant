import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UI_LABELS } from '../../constants/config.ts';
import { RecommendationCard } from '../../features/assistant/RecommendationCard.tsx';
import { RecommendationCategory, UrgencyLevel } from '../../types/index.ts';

afterEach(() => {
  cleanup();
});

describe('RecommendationCard', () => {
  it('renders title, action, urgency badge, and direct impact as plain text without HTML execution', () => {
    const xssPayload = '<script>alert(1)</script> Seal windows tight';
    const imgPayload = '<img src=x onerror=alert(1)> Cuts fine particle infiltration by 45%';

    const { container } = render(
      <ul>
        <RecommendationCard
          item={{
            title: xssPayload,
            category: RecommendationCategory.INDOOR_AIR,
            action: 'Run HEPA filter <script>alert(1)</script> continuously.',
            impactExplanation: imgPayload,
            estimatedPM25Reduction: 45,
            urgency: UrgencyLevel.HIGH,
          }}
        />
      </ul>,
    );

    expect(container.querySelectorAll('script')).toHaveLength(0);
    expect(container.querySelectorAll('img')).toHaveLength(0);

    expect(screen.getByText(xssPayload)).toBeInTheDocument();
    expect(
      screen.getByText('Run HEPA filter <script>alert(1)</script> continuously.'),
    ).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText(UI_LABELS.IMPACT_EXPLANATION_LABEL)).toBeInTheDocument();
    expect(screen.getByText('-45% PM2.5')).toBeInTheDocument();
    expect(screen.getByText(imgPayload)).toBeInTheDocument();
  });
});
