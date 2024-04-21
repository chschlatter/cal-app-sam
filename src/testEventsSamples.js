// @ts-check

const samples = {
  listEvents: [
    {
      id: "",
      title: "Christian",
      start: "02-26",
      end: "03-06",
    },
    {
      id: "",
      title: "Nils",
      start: "03-05",
      end: "03-13",
    },
    {
      id: "",
      title: "Nils",
      start: "03-13",
      end: "03-16",
    },
  ],
};

/**
 * Get sample data for the given test name and year
 * @param {string} name - test name
 * @param {number} year - year
 * @returns {Array<import("./model/events2.model").Event>}
 */
const getSample = (name, year) => {
  return samples[name].map((sample) => {
    return {
      ...sample,
      start: `${year}-${sample.start}`,
      end: `${year}-${sample.end}`,
    };
  });
};

module.exports = {
  getSample,
};
