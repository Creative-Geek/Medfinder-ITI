// Product service -- all product-related Supabase REST calls
angular.module("medfinderApp").factory("ProductService", [
  "$http",
  "SUPABASE",
  function ($http, SUPABASE) {
    var base = SUPABASE.REST_URL + "/products";

    return {
      // Get all products (with optional query params for filtering)
      getAll: function (params) {
        return $http.get(base, { params: params });
      },

      // Get single product by ID
      getById: function (id) {
        return $http.get(base + "?id=eq." + id, {
          headers: { Accept: "application/vnd.pgrst.object+json" },
        });
      },

      // Get products by category
      getByCategory: function (category, limit) {
        var url = base + "?category=eq." + encodeURIComponent(category);
        if (limit) url += "&limit=" + limit;
        return $http.get(url);
      },

      // Search products by name (ilike)
      search: function (query) {
        return $http.get(
          base + "?name=ilike.*" + encodeURIComponent(query) + "*",
        );
      },

      // Get distinct categories
      getCategories: function () {
        return $http.get(base + "?select=category&order=category.asc");
      },

      // Get distinct brands/manufacturers
      getBrands: function () {
        return $http.get(base + "?select=manufacturer&order=manufacturer.asc");
      },

      // Admin: create product
      create: function (product) {
        return $http.post(base, product, {
          headers: { Prefer: "return=representation" },
        });
      },

      // Admin: update product
      update: function (id, data) {
        return $http.patch(base + "?id=eq." + id, data, {
          headers: { Prefer: "return=representation" },
        });
      },

      // Admin: delete product
      remove: function (id) {
        return $http.delete(base + "?id=eq." + id);
      },
    };
  },
]);
