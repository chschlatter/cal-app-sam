export interface PriceData {
  from: string; // ISO date string "YYYY-MM-DD"
  price: number; // Price per night
  tariff: string; // Tariff name (e.g., "Winter", "Sommer")
}

export interface TariffBreakdown {
  [tariffName: string]: {
    cost: number;
    nights: number;
  };
}

export interface PriceCalculationResult {
  success: boolean;
  totalCost: number;
  breakdown: TariffBreakdown;
  error?: string;
}

export class PricingService {
  private static instance: PricingService | null = null;
  private priceData: PriceData[];

  private constructor(priceData: PriceData[]) {
    // Sort price data by date, newest first
    this.priceData = [...priceData].sort(
      (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
    );
  }

  /**
   * Initialize the singleton instance with price data
   * Call this once at application startup
   */
  static initialize(priceData: PriceData[]): void {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService(priceData);
    }
  }

  /**
   * Get the singleton instance
   * @throws Error if not initialized
   */
  static getInstance(): PricingService {
    if (!PricingService.instance) {
      throw new Error(
        "PricingService not initialized. Call PricingService.initialize() first."
      );
    }
    return PricingService.instance;
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  static reset(): void {
    PricingService.instance = null;
  }

  /**
   * Calculate cost and nights for a date range
   * @param startDate - Start date (ISO string or Date)
   * @param endDate - End date (ISO string or Date)
   * @returns Calculation result with breakdown
   */
  calculateCostAndNights(
    startDate: string | Date,
    endDate: string | Date
  ): PriceCalculationResult {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          success: false,
          totalCost: 0,
          breakdown: {},
          error: "Ungültige Datumswerte",
        };
      }

      if (start > end) {
        return {
          success: false,
          totalCost: 0,
          breakdown: {},
          error: "Keine Kostenberechnung möglich",
        };
      }

      const breakdown: TariffBreakdown = {};
      let endDateToCalculate = new Date(end);

      // Iterate through price data (sorted newest first)
      for (const price of this.priceData) {
        const priceFromDate = new Date(price.from);

        if (priceFromDate < endDateToCalculate) {
          // Calculate cost and nights for this price until endDateToCalculate
          let nights = 0;

          if (priceFromDate < start) {
            // Price period starts before our range
            nights =
              (endDateToCalculate.getTime() - start.getTime()) /
              (1000 * 60 * 60 * 24);
          } else {
            // Price period starts within our range
            nights =
              (endDateToCalculate.getTime() - priceFromDate.getTime()) /
              (1000 * 60 * 60 * 24);
          }

          const cost = nights * price.price;

          // Update breakdown
          if (!breakdown[price.tariff]) {
            breakdown[price.tariff] = { cost, nights };
          } else {
            breakdown[price.tariff].cost += cost;
            breakdown[price.tariff].nights += nights;
          }

          endDateToCalculate = priceFromDate;

          if (endDateToCalculate <= start) {
            break;
          }
        }
      }

      // Check if we covered the entire date range
      if (endDateToCalculate > start) {
        return {
          success: false,
          totalCost: 0,
          breakdown: {},
          error: "Keine Kostenberechnung möglich",
        };
      }

      // Calculate total cost
      let totalCost = 0;
      for (const tariff in breakdown) {
        totalCost += breakdown[tariff].cost;
      }

      return {
        success: true,
        totalCost,
        breakdown,
      };
    } catch (error) {
      return {
        success: false,
        totalCost: 0,
        breakdown: {},
        error: "Keine Kostenberechnung möglich",
      };
    }
  }

  /**
   * Format calculation result as display string
   * @param result - Calculation result
   * @param locale - Locale for formatting (default: 'de-CH')
   * @returns Formatted string like "120 CHF (2 Nächte Winter, 1 Nacht Sommer)"
   */
  formatPriceString(
    result: PriceCalculationResult,
    locale: string = "de-CH"
  ): string {
    if (!result.success || result.error) {
      return result.error || "Keine Kostenberechnung möglich";
    }

    // If total cost is 0, return "kostenlos"
    if (result.totalCost === 0) {
      return "kostenlos";
    }

    // Build tariff strings array
    const tariffStrings: string[] = [];
    for (const tariff in result.breakdown) {
      const { nights } = result.breakdown[tariff];

      if (nights === 1) {
        tariffStrings.unshift("1 Nacht " + tariff);
      } else if (nights > 1) {
        tariffStrings.unshift(nights + " Nächte " + tariff);
      }
    }

    // Create result string
    return `${result.totalCost} CHF (${tariffStrings.join(", ")})`;
  }

  /**
   * Returns the raw price data sorted by date (newest first)
   */
  getPriceData(): PriceData[] {
    return this.priceData;
  }

  /**
   * Convenience method: calculate and format in one call
   */
  getPriceString(startDate: string | Date, endDate: string | Date): string {
    const result = this.calculateCostAndNights(startDate, endDate);
    return this.formatPriceString(result);
  }
}
