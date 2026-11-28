# ADR 005: Deterministic Urgency Rule Layer After the Model

- **Status**: Accepted

## Context

Generative recommendations alone cannot guarantee safety-critical alerts (such as fitted N95/KF94 guidance or staying indoors during hazardous smog) are prioritized consistently, or that household-specific triggers (children, older adults, respiratory conditions, active commutes, home type) are never omitted.

## Decision

Every assistant response passes first through `parseAndValidateAssistantResponse` (falling back safely to `SAFE_FALLBACK_ASSISTANT_RESPONSE` on malformed output) and then through a deterministic TypeScript rule layer (`applyUrgencyRules` in `src/utils/urgencyRules.ts`). Critical health alerts inject/promote at `AQI >= 101` for sensitive households and `AQI >= 151` universally, alongside commute and housing draft-sealing rules.

## Consequences

- Critical public health guidance and urgency ranking (`CRITICAL > HIGH > STANDARD`) are deterministic and unit-tested independently of model variance.
- Even if Gemini returns unparseable JSON or only general tips, vulnerable households always see accurate stay-indoors and filtration alerts.
