import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAccessibleResourceFilter,
  getResources
} from "../src/modules/resources/resource.controller.js";
import { Resource } from "../src/modules/resources/resource.model.js";

test("buildAccessibleResourceFilter returns public-only access for guests", () => {
  const filter = buildAccessibleResourceFilter(null);

  assert.deepEqual(filter, {});
});

test("buildAccessibleResourceFilter includes owner, same-college, grant, and subscription access", () => {
  const filter = buildAccessibleResourceFilter(
    {
      id: "user-123",
      role: "student",
      collegeName: "AB college"
    },
    {
      protectedGrantIds: new Set(["resource-1", "resource-2"]),
      hasBasicSubscription: true
    }
  );

  assert.equal(Array.isArray(filter.$or), true);
  assert.deepEqual(filter.$or[0], { uploadedBy: "user-123" });
  assert.deepEqual(filter.$or[1], { visibility: "public" });
  assert.equal(filter.$or[2].$and[0].visibility, "private");
  assert.equal(filter.$or[2].$and[1].collegeName.test("AB   college"), true);
  assert.equal(filter.$or[3].$and[0].visibility, "protected");
  assert.equal(filter.$or[3].$and[1].collegeName.test("AB college"), true);
  assert.deepEqual(filter.$or[4], {
    visibility: "protected",
    $or: [{ _id: { $in: ["resource-1", "resource-2"] } }, { allowBasicSubscription: true }]
  });
});

test("getResources applies access filters and pagination inside Mongo queries", async () => {
  const originalCountDocuments = Resource.countDocuments;
  const originalFind = Resource.find;
  const seen = {};
  let responsePayload = null;

  Resource.countDocuments = async (filter) => {
    seen.countFilter = filter;
    return 7;
  };

  Resource.find = (filter) => {
    seen.findFilter = filter;

    return {
      sort(sortSpec) {
        seen.sort = sortSpec;
        return this;
      },
      skip(skipValue) {
        seen.skip = skipValue;
        return this;
      },
      limit(limitValue) {
        seen.limit = limitValue;
        return this;
      },
      populate(path, select) {
        seen.populate = { path, select };
        return Promise.resolve([
          {
            _id: "resource-1",
            title: "Public resource",
            visibility: "public",
            storageProvider: "cloud"
          }
        ]);
      }
    };
  };

  try {
    await getResources(
      {
        query: {
          collegeName: "AB college",
          categoryId: "books",
          search: "math",
          page: "2",
          limit: "3"
        }
      },
      {
        json(payload) {
          responsePayload = payload;
        }
      },
      (error) => {
        if (error) {
          throw error;
        }
      }
    );
  } finally {
    Resource.countDocuments = originalCountDocuments;
    Resource.find = originalFind;
  }

  assert.deepEqual(seen.sort, { createdAt: -1 });
  assert.equal(seen.skip, 3);
  assert.equal(seen.limit, 3);
  assert.deepEqual(seen.populate, { path: "uploadedBy", select: "fullName role" });
  assert.deepEqual(seen.findFilter, seen.countFilter);
  assert.equal(seen.findFilter.categoryId, "books");
  assert.equal(seen.findFilter.collegeName.test("AB college"), true);
  assert.equal(responsePayload.data.items.length, 1);
  assert.equal(responsePayload.data.pagination.total, 7);
  assert.equal(responsePayload.data.pagination.page, 2);
  assert.equal(responsePayload.data.pagination.limit, 3);
});
