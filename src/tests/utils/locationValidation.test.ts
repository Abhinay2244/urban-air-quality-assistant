import { describe, expect, it } from 'vitest';
import { resolveServerPort } from '../../../server/app.ts';
import { SERVER_CONFIG } from '../../constants/server.ts';
import {
  buildLocationWarning,
  computeHaversineKm,
  isInsideIndia,
} from '../../utils/locationValidation.ts';

describe('locationValidation and server PORT resolution', () => {
  it('identifies Indian coordinates and computes Haversine distance accurately', () => {
    expect(isInsideIndia(28.6139, 77.209)).toBe(true);
    expect(isInsideIndia(51.5074, -0.1278)).toBe(false);

    const delhi = { latitude: 28.6139, longitude: 77.209 };
    const noida = { latitude: 28.5355, longitude: 77.391 };
    const distance = computeHaversineKm(delhi, noida);
    expect(distance).toBeGreaterThan(15);
    expect(distance).toBeLessThan(25);
  });

  it('warns when station is outside India or farther than 50 km from requested city', () => {
    const foreignWarning = buildLocationWarning({
      resolvedPlace: 'London, United Kingdom',
      country: 'United Kingdom',
      countryCode: 'GB',
      stationCoords: { latitude: 51.5, longitude: -0.12 },
    });
    expect(foreignWarning).toContain('outside India');

    const distantWarning = buildLocationWarning({
      resolvedPlace: 'Distant Station',
      stationCoords: { latitude: 27.18, longitude: 78.02 },
      requestedCoords: { latitude: 28.61, longitude: 77.21 },
      requestedLabel: 'Delhi',
    });
    expect(distantWarning).toContain('km from Delhi');

    const localOk = buildLocationWarning({
      resolvedPlace: 'Anand Vihar, Delhi',
      country: 'India',
      countryCode: 'IN',
      stationCoords: { latitude: 28.65, longitude: 77.31 },
      requestedCoords: { latitude: 28.61, longitude: 77.21 },
      requestedLabel: 'Delhi',
    });
    expect(localOk).toBeUndefined();
  });

  it('reads PORT from env with default 3000 fallback for invalid values', () => {
    expect(resolveServerPort(undefined)).toBe(SERVER_CONFIG.PORT);
    expect(resolveServerPort('8080')).toBe(8080);
    expect(resolveServerPort('0')).toBe(SERVER_CONFIG.PORT);
    expect(resolveServerPort('abc')).toBe(SERVER_CONFIG.PORT);
  });
});
