import Airtable from "airtable";
import * as core from "@actions/core";

const AIRTABLE_API_KEY = core.getInput("AIRTABLE_API_KEY");
const AIRTABLE_BASE_ID = core.getInput("AIRTABLE_BASE_ID");

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

const automatedReviewTable = base("Automated Review Association");

const lookupTextFormula = (labels, issues) => {
  const labelConditionals = labels.map(
    (label) => `FIND("${label}", ARRAYJOIN(Labels))`
  );
  const issueConditionals = issues.map(
    (issue) => `FIND("${issue}", ARRAYJOIN(Issues))`
  );

  const conditionals = labelConditionals.concat(issueConditionals).join(", ");

  if (!conditionals) {
    return "1";
  }

  const finalFormula = `IF(OR(${conditionals}),1,0)`;
  return finalFormula;
};

const fetchProblemTags = (labels, issues) => {
  const formula = lookupTextFormula(labels, issues);

  const fetchResult = new Promise((resolve, reject) => {
    const categories = new Set();
    const tags = {};

    automatedReviewTable
      .select({
        fields: ["Name", "Category"],
        filterByFormula: formula,
      })
      .eachPage(
        (records, fetchNextPage) => {
          records.forEach((record) => {
            const tag = record.get("Name");
            const category = record.get("Category");

            categories.add(category);

            if (tags.hasOwnProperty(category)) {
              const prev = tags[category];
              tags[category] = [...prev, tag];
            } else {
              tags[category] = [tag];
            }
          });

          fetchNextPage();
        },
        (err) => {
          if (err) {
            reject(err);
          }
          resolve({ categories, tags });
        }
      );
  });

  return fetchResult;
};

export { fetchProblemTags };
