import mongoose from "mongoose";

mongoose.plugin((schema) => {
  for (const path in schema.paths) {
    const type = schema.paths[path];
    if (
      type.instance === "String" &&
      type.options.maxlength === undefined &&
      type.options.enum === undefined
    ) {
      // Default to 100,000 chars (approx 100KB) to prevent massive document DoS
      // while allowing rich text content like lecture notes or resource descriptions.
      type.options.maxlength = 100000;
    }
  }
});
