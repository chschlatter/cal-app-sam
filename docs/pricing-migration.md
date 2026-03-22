# Design: Server-Side Pricing Calculation Migration

## Overview
Migrate the pricing calculation logic from client-side JavaScript ([calPricing.js](front/src/calPricing.js)) to server-side TypeScript, exposing it via an HTMX-compatible endpoint.

## Current State

### Client-Side Implementation
- **Location**: [front/src/calPricing.js](front/src/calPricing.js)
- **Class**: `Pricing`
- **Key Methods**:
  - `init(apiUrl)`: Fetches prices from `/api2/prices` and sorts by date (newest first)
  - `calculateCostAndNights(startDateStr, endDateStr)`: Core calculation logic
  - `getCostAndNightsString(startDateStr, endDateStr)`: Formats result for display

### Pricing Logic
The calculation splits a date range across multiple tariff periods:
1. Iterates through sorted price data (newest first)
2. For each tariff period that overlaps with the date range:
   - Calculates number of nights in that period
   - Multiplies nights by tariff price
   - Accumulates costs and nights per tariff name
3. Returns formatted string: "120 CHF (2 Nächte Winter, 1 Nacht Sommer)" or "kostenlos"

### Frontend Integration (HTMX)
Already prepared in [eventForm.ts:122-131](src/handlers/routes/eventForm.ts#L122-L131):
```html
<div class="row"
     id="price-row"
     hx-trigger="change from:#date-start, change from:#date-end"
     hx-include="#date-start, #date-end"
     hx-get="/api2/event/form/price"
     hx-swap="innerHTML"
     hx-target="this">
  <!-- price will be loaded here -->
</div>
```

## Proposed Architecture

### 1. Pricing Module (New)
**Location**: `src/lib/pricing.ts`

**Purpose**: Pure calculation logic, reusable across the application

**Interface**:
```typescript
export interface PriceData {
  from: string;        // ISO date string "YYYY-MM-DD"
  price: number;       // Price per night
  tariff: string;      // Tariff name (e.g., "Winter", "Sommer")
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
      throw new Error("PricingService not initialized. Call PricingService.initialize() first.");
    }
    return PricingService.instance;
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
    // Implementation here
  }

  /**
   * Format calculation result as display string
   * @param result - Calculation result
   * @param locale - Locale for formatting (default: 'de-CH')
   * @returns Formatted string like "120 CHF (2 Nächte Winter, 1 Nacht Sommer)"
   */
  formatPriceString(
    result: PriceCalculationResult,
    locale: string = 'de-CH'
  ): string {
    // Implementation here
  }

  /**
   * Convenience method: calculate and format in one call
   */
  getPriceString(
    startDate: string | Date,
    endDate: string | Date
  ): string {
    const result = this.calculateCostAndNights(startDate, endDate);
    return this.formatPriceString(result);
  }
}
```

**Key Design Decisions**:
- **Singleton pattern**: Price data loaded once at initialization
- **Private constructor**: Prevents direct instantiation
- **Static initialization**: `PricingService.initialize(priceData)` called once at app startup
- **Type safety**: Strong TypeScript types for all interfaces
- **Testability**: Can inject mock data via `initialize()` in tests
- **Reusability**: Single instance used throughout the application
- **Error handling**: Returns structured errors rather than throwing (except for uninitialized access)
- **i18n ready**: `formatPriceString` accepts locale parameter for future internationalization
- **Convenience method**: `getPriceString()` combines calculation and formatting

### 2. API Endpoint (New)
**Location**: Add to [src/handlers/routes/eventForm.ts](src/handlers/routes/eventForm.ts)

**Endpoint**: `GET /api2/event/form/price`

**Query Parameters**:
- `start` (required): Start date in YYYY-MM-DD format
- `end` (required): End date in YYYY-MM-DD format

**Response**: HTML fragment (inner content only, no wrapper div)
```html
<p>120 CHF (2 Nächte Winter, 1 Nacht Sommer)</p>
```

Or on error:
```html
<p class="text-danger">Keine Kostenberechnung möglich</p>
```

**Note**: Since the HTMX call uses `hx-swap="innerHTML"` on the `#price-row` div (which already has `class="row"`), we only return the `<p>` element, not wrapped in another div.

**Implementation Approach**:
```typescript
// In eventForm.ts - update existing GET route
import { PricingService } from "../../lib/pricing";

app.get("/:price?", async (c) => {
  const param = c.req.param("price");

  if (param === "price") {
    const { start, end } = c.req.query();

    // Validate inputs
    if (!start?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return c.html('<p class="text-danger">Ungültiges Startdatum</p>');
    }
    if (!end?.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return c.html('<p class="text-danger">Ungültiges Enddatum</p>');
    }

    // Get singleton instance and calculate price
    const pricingService = PricingService.getInstance();
    const priceString = pricingService.getPriceString(start, end);

    return c.html(`<p>${priceString}</p>`);
  } else {
    // Existing form rendering logic
    // ...
  }
});
```

### 3. Initialization
**Price Data Source**: [prices.json](prices.json)

**Initialization Strategy**:
- Initialize `PricingService` once when the Lambda handler starts
- Add initialization code at the top of [calApi.ts](src/handlers/calApi.ts)
- Price data loaded into memory once and reused for all requests

```typescript
// In calApi.ts - at the top level (outside handler)
import prices from "../../prices.json";
import { PricingService } from "../lib/pricing";

// Initialize pricing service once at Lambda cold start
PricingService.initialize(prices);

const app = new Hono<{ Variables: Variables }>();
// ... rest of the code
```

**Lambda Context**:
- Lambda containers reuse the execution environment between invocations
- Top-level code (outside the handler) runs once per cold start
- The singleton pattern ensures prices are loaded once and cached
- Subsequent requests reuse the same instance (fast, memory-efficient)

### 4. Frontend Changes
**Location**: [front/src/calPricing.js](front/src/calPricing.js)

**Action**:
- Keep file for reference during migration
- Once server-side is tested and deployed, can be removed
- Update any imports/references in the frontend bundle

**HTMX Integration**:
- Already implemented in [eventForm.ts:122-131](src/handlers/routes/eventForm.ts#L122-L131)
- No frontend changes needed
- HTMX will automatically call the endpoint when date fields change

## Implementation Plan

### Phase 1: Create Pricing Module
1. Create `src/lib/pricing.ts`
2. Implement `PricingService` class with singleton pattern
3. Port calculation logic from `calPricing.js`
4. Add TypeScript types and interfaces
5. Improve error handling
6. Add unit tests

### Phase 2: Initialize at Application Startup
1. Update `src/handlers/calApi.ts`
2. Add `PricingService.initialize(prices)` at top level
3. Ensure initialization happens once per Lambda cold start

### Phase 3: Implement API Endpoint
1. Update `src/handlers/routes/eventForm.ts`
2. Modify existing GET route to handle `/api2/event/form/price`
3. Use `PricingService.getInstance()` to get singleton
4. Return HTMX-compatible HTML fragments
5. Handle validation and error cases

### Phase 4: Testing
1. Unit test `PricingService.calculateCostAndNights()` with various date ranges
2. Unit test `PricingService.formatPriceString()` with different results
3. Test singleton pattern (initialization, getInstance)
4. Test edge cases:
   - Same start/end date
   - Start date after end date
   - Date ranges spanning multiple tariffs
   - Dates outside price data range
5. Integration test the endpoint
6. Manual testing with HTMX in the UI

### Phase 5: Cleanup
1. Verify frontend no longer needs `calPricing.js`
2. Remove client-side pricing code
3. Update frontend build configuration if needed
4. Update documentation

## File Structure

```
src/
├── lib/
│   └── pricing.ts                    # NEW: Core pricing logic
├── handlers/
│   └── routes/
│       └── eventForm.ts              # MODIFIED: Add /price endpoint
└── tests/
    └── lib/
        └── pricing.test.ts           # NEW: Unit tests

front/src/
└── calPricing.js                     # DEPRECATED: To be removed after migration
```

## Benefits of This Design

1. **Separation of Concerns**: Business logic (pricing) separated from presentation (HTMX endpoint)
2. **Maintainability**: Single source of truth for pricing calculations
3. **Testability**: Singleton can be initialized with test data, easy to unit test
4. **Type Safety**: TypeScript catches errors at compile time
5. **Reusability**: Single instance used throughout the application
6. **Performance**:
   - Server-side calculation, no client-side bundle bloat
   - Price data loaded once per Lambda cold start (not per request)
   - Fast subsequent requests reuse cached instance
7. **Security**: Pricing logic not exposed to client manipulation
8. **Consistency**: Same calculation logic and data across all contexts
9. **Memory Efficient**: Single instance shared across all requests in the Lambda container

## Potential Enhancements (Future)

1. **Caching**: Cache price calculations for repeated queries
2. **Database**: Move prices.json to DynamoDB for dynamic updates
3. **i18n**: Full internationalization support (already architected for this)
4. **Logging**: Add detailed logging for debugging price calculations
5. **Validation**: Cross-validate calculated prices during event creation
6. **API Documentation**: Add OpenAPI schema for the price endpoint
7. **Rate Limiting**: Protect the endpoint from abuse

## Migration Strategy

**Option A: Big Bang (Recommended for this case)**
- Implement entire solution in one PR
- Test thoroughly
- Deploy and verify
- Remove old client code

**Option B: Gradual Migration**
- Keep both implementations running
- Add feature flag to switch between client/server
- Gradually roll out to users
- More complex, not needed for this straightforward migration

**Recommendation**: Option A - the change is isolated and straightforward enough for a single deployment.

## Testing Checklist

- [ ] Unit tests for `PricingService.initialize()` and singleton behavior
- [ ] Unit tests for `PricingService.calculateCostAndNights()`
- [ ] Unit tests for `PricingService.formatPriceString()`
- [ ] Unit tests for `PricingService.getPriceString()` convenience method
- [ ] Test with empty date range (0 nights)
- [ ] Test with single night
- [ ] Test spanning one tariff period
- [ ] Test spanning multiple tariff periods
- [ ] Test with invalid dates
- [ ] Test with start > end
- [ ] Test with dates outside price data range
- [ ] Test getInstance() throws error when not initialized
- [ ] Integration test GET `/api2/event/form/price`
- [ ] Manual test in UI with HTMX
- [ ] Verify existing form functionality unchanged
- [ ] Test error handling and display

## Success Criteria

1. ✅ Pricing calculation moved to server-side
2. ✅ HTMX endpoint returns correct HTML fragments
3. ✅ Frontend displays prices dynamically on date change
4. ✅ All existing functionality preserved
5. ✅ No breaking changes to event form
6. ✅ Unit tests achieve >90% coverage
7. ✅ Client-side bundle size reduced (after cleanup)
8. ✅ No regressions in existing features
