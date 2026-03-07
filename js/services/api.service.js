// Low-level Supabase REST API wrapper
// Most calls go through domain-specific services (ProductService, etc.)
// This service provides shared helpers if needed
angular.module("medfinderApp").factory("ApiService", [
  "$http",
  "SUPABASE",
  function ($http, SUPABASE) {
    return {
      // Generic GET with full URL
      get: function (path, params) {
        return $http.get(SUPABASE.REST_URL + path, { params: params });
      },

      // Generic POST
      post: function (path, data) {
        return $http.post(SUPABASE.REST_URL + path, data, {
          headers: { Prefer: "return=representation" },
        });
      },

      // Generic PATCH
      patch: function (path, data) {
        return $http.patch(SUPABASE.REST_URL + path, data, {
          headers: { Prefer: "return=representation" },
        });
      },

      // Generic DELETE
      remove: function (path) {
        return $http.delete(SUPABASE.REST_URL + path);
      },
    };
  },
]);
