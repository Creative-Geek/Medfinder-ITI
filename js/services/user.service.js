// User service -- profile and admin user management via Supabase REST
angular.module("medfinderApp").factory("UserService", [
  "$http",
  "SUPABASE",
  function ($http, SUPABASE) {
    var base = SUPABASE.REST_URL + "/profiles";

    return {
      // Get current user's profile
      getProfile: function (userId) {
        return $http.get(base + "?id=eq." + userId, {
          headers: { Accept: "application/vnd.pgrst.object+json" },
        });
      },

      // Update profile
      updateProfile: function (userId, data) {
        return $http.patch(base + "?id=eq." + userId, data, {
          headers: { Prefer: "return=representation" },
        });
      },

      // Admin: list all users
      getAll: function () {
        return $http.get(base + "?order=created_at.desc");
      },

      // Admin: get user with their orders
      getWithOrders: function (userId) {
        return $http.get(base + "?id=eq." + userId + "&select=*,orders(*)", {
          headers: { Accept: "application/vnd.pgrst.object+json" },
        });
      },
    };
  },
]);
