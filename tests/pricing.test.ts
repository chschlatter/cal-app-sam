/**
 * Unit tests for PricingService
 */

import { describe, test, beforeEach } from "node:test";
import assert from "node:assert";
import {
  PricingService,
  type PriceData,
  type PriceCalculationResult,
} from "../src/lib/pricing";

describe("PricingService", () => {
  // Test price data mimicking prices.json structure
  const testPriceData: PriceData[] = [
    { from: "2024-10-20", price: 60.0, tariff: "Winter" },
    { from: "2024-04-20", price: 40.0, tariff: "Sommer" },
    { from: "2023-10-14", price: 60.0, tariff: "Winter" },
  ];

  beforeEach(() => {
    // Reset singleton before each test
    PricingService.reset();
  });

  describe("Singleton Pattern", () => {
    test("should initialize singleton instance", () => {
      PricingService.initialize(testPriceData);
      const instance = PricingService.getInstance();
      assert.ok(instance instanceof PricingService);
    });

    test("should return same instance on multiple getInstance calls", () => {
      PricingService.initialize(testPriceData);
      const instance1 = PricingService.getInstance();
      const instance2 = PricingService.getInstance();
      assert.strictEqual(instance1, instance2);
    });

    test("should throw error when getInstance called without initialization", () => {
      assert.throws(
        () => PricingService.getInstance(),
        /PricingService not initialized/
      );
    });

    test("should not reinitialize if already initialized", () => {
      PricingService.initialize(testPriceData);
      const instance1 = PricingService.getInstance();

      // Try to initialize again with different data
      PricingService.initialize([{ from: "2025-01-01", price: 100.0, tariff: "Test" }]);
      const instance2 = PricingService.getInstance();

      assert.strictEqual(instance1, instance2);
    });
  });

  describe("calculateCostAndNights", () => {
    beforeEach(() => {
      PricingService.initialize(testPriceData);
    });

    test("should calculate cost for single tariff period", () => {
      const service = PricingService.getInstance();
      const result = service.calculateCostAndNights("2024-10-21", "2024-10-25");

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.totalCost, 240); // 4 nights * 60 CHF
      assert.strictEqual(result.breakdown["Winter"].nights, 4);
      assert.strictEqual(result.breakdown["Winter"].cost, 240);
      assert.strictEqual(result.error, undefined);
    });

    test("should calculate cost spanning multiple tariff periods", () => {
      const service = PricingService.getInstance();
      // 10 days in Sommer (Apr 20-30) + 5 days in Winter (Oct 20-25)
      const result = service.calculateCostAndNights("2024-04-20", "2024-10-25");

      assert.strictEqual(result.success, true);
      // Summer: Apr 20 to Oct 20 = 183 days * 40 CHF = 7320 CHF
      // Winter: Oct 20 to Oct 25 = 5 days * 60 CHF = 300 CHF
      // Total: 7620 CHF
      assert.strictEqual(result.totalCost, 7620);
      assert.ok(result.breakdown["Sommer"]);
      assert.ok(result.breakdown["Winter"]);
      assert.strictEqual(result.breakdown["Sommer"].nights, 183);
      assert.strictEqual(result.breakdown["Winter"].nights, 5);
    });

    test("should handle single night stay", () => {
      const service = PricingService.getInstance();
      const result = service.calculateCostAndNights("2024-10-21", "2024-10-22");

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.totalCost, 60); // 1 night * 60 CHF
      assert.strictEqual(result.breakdown["Winter"].nights, 1);
    });

    test("should handle zero nights (same start and end date)", () => {
      const service = PricingService.getInstance();
      const result = service.calculateCostAndNights("2024-10-21", "2024-10-21");

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.totalCost, 0);
    });

    test("should return error when start date is after end date", () => {
      const service = PricingService.getInstance();
      const result = service.calculateCostAndNights("2024-10-25", "2024-10-21");

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.totalCost, 0);
      assert.strictEqual(result.error, "Keine Kostenberechnung möglich");
    });

    test("should return error for dates outside price data range", () => {
      const service = PricingService.getInstance();
      // Date before earliest price data (2023-10-14)
      const result = service.calculateCostAndNights("2023-01-01", "2023-01-05");

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, "Keine Kostenberechnung möglich");
    });

    test("should handle invalid date strings", () => {
      const service = PricingService.getInstance();
      const result = service.calculateCostAndNights("invalid-date", "2024-10-25");

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, "Ungültige Datumswerte");
    });

    test("should accept Date objects as input", () => {
      const service = PricingService.getInstance();
      const start = new Date("2024-10-21");
      const end = new Date("2024-10-25");
      const result = service.calculateCostAndNights(start, end);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.totalCost, 240);
    });

    test("should handle date range at tariff boundary", () => {
      const service = PricingService.getInstance();
      // End date exactly at tariff change
      const result = service.calculateCostAndNights("2024-04-15", "2024-04-20");

      assert.strictEqual(result.success, true);
      // Should use Winter tariff (from 2023-10-14) for these 5 days
      assert.strictEqual(result.breakdown["Winter"].nights, 5);
      assert.strictEqual(result.totalCost, 300); // 5 * 60
    });
  });

  describe("formatPriceString", () => {
    beforeEach(() => {
      PricingService.initialize(testPriceData);
    });

    test("should format single tariff result", () => {
      const service = PricingService.getInstance();
      const result: PriceCalculationResult = {
        success: true,
        totalCost: 240,
        breakdown: { Winter: { cost: 240, nights: 4 } },
      };

      const formatted = service.formatPriceString(result);
      assert.strictEqual(formatted, "240 CHF (4 Nächte Winter)");
    });

    test("should format multiple tariff result", () => {
      const service = PricingService.getInstance();
      const result: PriceCalculationResult = {
        success: true,
        totalCost: 340,
        breakdown: {
          Winter: { cost: 240, nights: 4 },
          Sommer: { cost: 100, nights: 2.5 },
        },
      };

      const formatted = service.formatPriceString(result);
      // Note: Order might vary depending on object iteration
      assert.ok(formatted.includes("340 CHF"));
      assert.ok(formatted.includes("4 Nächte Winter"));
      assert.ok(formatted.includes("2.5 Nächte Sommer"));
    });

    test("should format single night correctly", () => {
      const service = PricingService.getInstance();
      const result: PriceCalculationResult = {
        success: true,
        totalCost: 60,
        breakdown: { Winter: { cost: 60, nights: 1 } },
      };

      const formatted = service.formatPriceString(result);
      assert.strictEqual(formatted, "60 CHF (1 Nacht Winter)");
    });

    test("should return 'kostenlos' for zero cost", () => {
      const service = PricingService.getInstance();
      const result: PriceCalculationResult = {
        success: true,
        totalCost: 0,
        breakdown: {},
      };

      const formatted = service.formatPriceString(result);
      assert.strictEqual(formatted, "kostenlos");
    });

    test("should return error message for failed calculation", () => {
      const service = PricingService.getInstance();
      const result: PriceCalculationResult = {
        success: false,
        totalCost: 0,
        breakdown: {},
        error: "Keine Kostenberechnung möglich",
      };

      const formatted = service.formatPriceString(result);
      assert.strictEqual(formatted, "Keine Kostenberechnung möglich");
    });

    test("should handle result with 0 nights in breakdown", () => {
      const service = PricingService.getInstance();
      const result: PriceCalculationResult = {
        success: true,
        totalCost: 60,
        breakdown: {
          Winter: { cost: 60, nights: 1 },
          Sommer: { cost: 0, nights: 0 }, // Should be ignored
        },
      };

      const formatted = service.formatPriceString(result);
      assert.strictEqual(formatted, "60 CHF (1 Nacht Winter)");
    });
  });

  describe("getPriceString", () => {
    beforeEach(() => {
      PricingService.initialize(testPriceData);
    });

    test("should calculate and format in one call", () => {
      const service = PricingService.getInstance();
      const priceString = service.getPriceString("2024-10-21", "2024-10-25");

      assert.strictEqual(priceString, "240 CHF (4 Nächte Winter)");
    });

    test("should return error message for invalid dates", () => {
      const service = PricingService.getInstance();
      const priceString = service.getPriceString("2024-10-25", "2024-10-21");

      assert.strictEqual(priceString, "Keine Kostenberechnung möglich");
    });

    test("should return 'kostenlos' for zero nights", () => {
      const service = PricingService.getInstance();
      const priceString = service.getPriceString("2024-10-21", "2024-10-21");

      assert.strictEqual(priceString, "kostenlos");
    });
  });

  describe("Price Data Sorting", () => {
    test("should sort price data by date (newest first) on initialization", () => {
      // Initialize with unsorted data
      const unsortedData: PriceData[] = [
        { from: "2023-10-14", price: 60.0, tariff: "Winter" },
        { from: "2024-10-20", price: 60.0, tariff: "Winter" },
        { from: "2024-04-20", price: 40.0, tariff: "Sommer" },
      ];

      PricingService.initialize(unsortedData);
      const service = PricingService.getInstance();

      // Test that calculation works correctly (which depends on proper sorting)
      const result = service.calculateCostAndNights("2024-04-20", "2024-10-25");

      assert.strictEqual(result.success, true);
      // Should correctly split between Sommer and Winter
      assert.ok(result.breakdown["Sommer"]);
      assert.ok(result.breakdown["Winter"]);
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      PricingService.initialize(testPriceData);
    });

    test("should handle fractional nights correctly", () => {
      const service = PricingService.getInstance();
      // 1.5 days
      const result = service.calculateCostAndNights(
        "2024-10-21T00:00:00",
        "2024-10-22T12:00:00"
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.breakdown["Winter"].nights, 1.5);
      assert.strictEqual(result.totalCost, 90); // 1.5 * 60
    });

    test("should handle very long date ranges", () => {
      const service = PricingService.getInstance();
      // Full year spanning multiple tariffs
      const result = service.calculateCostAndNights("2024-01-01", "2024-12-31");

      assert.strictEqual(result.success, true);
      assert.ok(result.totalCost > 0);
      assert.ok(result.breakdown["Winter"]);
      assert.ok(result.breakdown["Sommer"]);
    });
  });
});
