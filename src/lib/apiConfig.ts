/**
 * API Configuration Layer
 * Provides platform-aware API URLs for web and mobile
 *
 * Web: Uses relative URLs (same origin)
 * Mobile: Uses configured desktop server URL
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const SERVER_URL_KEY = 'serverUrl';
const DEFAULT_PORT = '5173';

class ApiConfig {
  private static serverUrl: string | null = null;
  private static initialized = false;

  /**
   * Initialize the API configuration
   * Should be called on app startup
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: SERVER_URL_KEY });
      this.serverUrl = value || null;
    }

    this.initialized = true;
  }

  /**
   * Get the base URL for API calls
   * Web: Empty string (relative URLs work for same origin)
   * Mobile: Configured desktop server URL
   */
  static async getBaseUrl(): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!Capacitor.isNativePlatform()) {
      // Web version: use relative URLs (same origin)
      return '';
    }

    // Mobile version: return configured server URL
    if (!this.serverUrl) {
      throw new Error(
        'Server URL not configured. Please configure your desktop server address in Settings.'
      );
    }

    return this.serverUrl;
  }

  /**
   * Get the full API endpoint URL
   * @param endpoint - The API endpoint (e.g., '/api/db')
   * @returns Full URL for the endpoint
   */
  static async getApiUrl(endpoint: string): Promise<string> {
    const base = await this.getBaseUrl();

    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${base}${normalizedEndpoint}`;
  }

  /**
   * Configure the server URL (mobile only)
   * @param url - Server URL (e.g., 'http://192.168.1.5:5173')
   */
  static async setServerUrl(url: string): Promise<void> {
    // Remove trailing slash if present
    const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    // Validate URL format
    try {
      const urlObj = new URL(normalizedUrl);

      // Ensure it's HTTP or HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      throw new Error(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Save to preferences
    await Preferences.set({ key: SERVER_URL_KEY, value: normalizedUrl });
    this.serverUrl = normalizedUrl;
  }

  /**
   * Test connection to the configured server
   * @returns true if server is reachable, false otherwise
   */
  static async testConnection(): Promise<boolean> {
    try {
      const apiUrl = await this.getApiUrl('/api/db');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'query',
          params: { tableName: 'restaurants', select: '*' }
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      return response.ok;
    } catch (error) {
      console.error('Server connection test failed:', error);
      return false;
    }
  }

  /**
   * Get the current server URL (mobile only)
   */
  static async getServerUrl(): Promise<string | null> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.serverUrl;
  }

  /**
   * Clear the saved server URL (mobile only)
   */
  static async clearServerUrl(): Promise<void> {
    await Preferences.remove({ key: SERVER_URL_KEY });
    this.serverUrl = null;
  }

  /**
   * Check if running on mobile platform
   */
  static isMobile(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get platform name
   */
  static getPlatform(): string {
    return Capacitor.getPlatform();
  }
}

export default ApiConfig;
