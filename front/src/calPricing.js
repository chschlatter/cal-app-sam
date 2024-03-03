export class Pricing {
  priceData = [];

  init(apiUrl) {
    let response;
    fetch(`${apiUrl}/prices`)
      .then((resp) => {
        response = resp;
        return response.json();
      })
      .then((data) => {
        if (!response.ok) {
          throw new Error(response.status + ": " + data.message);
        }
        // priceData = data sorted by start date, newest first
        this.priceData = data.sort(
          (a, b) => new Date(b.from) - new Date(a.from)
        );
        console.log("Pricing.init(): " + JSON.stringify(data));
      })
      .catch((error) => {
        console.log("Pricing.init(): " + error.message);
      });
  }

  calculateCostAndNights(startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (startDate > endDate) {
      throw new Error("Keine Kostenberechnung möglich");
    }

    const result = {};
    let endDateToCalulate = endDate;
    for (const price of this.priceData) {
      const priceFromDate = new Date(price.from);
      if (priceFromDate < endDateToCalulate) {
        // calculate cost and nights for this price until endDateToCalulate
        let nights = 0;
        if (priceFromDate < startDate) {
          nights = (endDateToCalulate - startDate) / (1000 * 60 * 60 * 24);
        } else {
          nights = (endDateToCalulate - priceFromDate) / (1000 * 60 * 60 * 24);
        }
        const cost = nights * price.price;

        // update result
        if (!result[price.tariff]) {
          result[price.tariff] = { cost, nights };
        } else {
          result[price.tariff].cost += cost;
          result[price.tariff].nights += nights;
        }

        endDateToCalulate = priceFromDate;
        if (endDateToCalulate <= startDate) {
          break;
        }
      }
    }

    if (endDateToCalulate > startDate) {
      throw new Error("Keine Kostenberechnung möglich");
    }

    return result;
  }

  getCostAndNightsString(startDateStr, endDateStr) {
    try {
      const result = this.calculateCostAndNights(startDateStr, endDateStr);

      // calculate total cost and nights
      let totalCost = 0;
      let tariffStrings = [];
      for (const tariff in result) {
        totalCost += result[tariff].cost;
        // add tariff string to beginning of array
        if (result[tariff].nights == 1) {
          tariffStrings.unshift("1 Nacht " + tariff);
        } else if (result[tariff].nights > 1) {
          tariffStrings.unshift(result[tariff].nights + " Nächte " + tariff);
        }
      }

      // create result string
      if (totalCost == 0) {
        return "kostenlos";
      } else {
        return totalCost + " CHF (" + tariffStrings.join(", ") + ")";
      }
    } catch (error) {
      return error.message;
    }
  }
}
