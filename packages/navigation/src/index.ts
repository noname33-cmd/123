/** Capability boundary only. Provider operations require a separate verified SDK design. */
export interface NavigationEngine {
  getAvailability(): Promise<NavigationAvailability>;
}

export type NavigationAvailability =
  | {available: true; provider: string}
  | {available: false; reason: 'provider-not-configured'};

export class UnavailableNavigationEngine implements NavigationEngine {
  async getAvailability(): Promise<NavigationAvailability> {
    return {available: false, reason: 'provider-not-configured'};
  }
}
