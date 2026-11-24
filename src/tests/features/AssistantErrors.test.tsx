import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.tsx';
import { APP_TEXT } from '../../constants/config.ts';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/http.ts';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Specific Gemini server error propagation', () => {
  it.each([
    [HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_MESSAGES.AI_QUOTA_EXCEEDED],
    [HTTP_STATUS.GATEWAY_TIMEOUT, ERROR_MESSAGES.UPSTREAM_TIMEOUT],
    [HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.INVALID_AI_REQUEST],
  ])(
    'displays specific safe server error (%i) instead of generic AI failure',
    async (status, expectedMessage) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(
            jsonResponse({ city: 'Delhi', country: 'India', aqi: 150, pm25: 75 }, HTTP_STATUS.OK),
          )
          .mockResolvedValueOnce(
            jsonResponse({ code: ERROR_CODES.AI_SERVICE_ERROR, message: expectedMessage }, status),
          ),
      );

      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(expectedMessage);
      });
      expect(screen.getByRole('alert')).not.toHaveTextContent(ERROR_MESSAGES.AI_REQUEST_FAILED);
    },
  );
});
