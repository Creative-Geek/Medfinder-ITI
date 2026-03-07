// Auth service -- Supabase Auth REST API (email/password only)
angular.module("medfinderApp").factory("AuthService", [
  "$http",
  "SUPABASE",
  function ($http, SUPABASE) {
    var AUTH = SUPABASE.AUTH_URL;

    return {
      // Sign up with email + password
      signup: function (email, password, fullName) {
        return $http.post(AUTH + "/signup", {
          email: email,
          password: password,
          data: { full_name: fullName },
        });
      },

      // Login with email + password
      login: function (email, password) {
        return $http
          .post(AUTH + "/token?grant_type=password", {
            email: email,
            password: password,
          })
          .then(function (res) {
            // Store tokens in session
            if (res.data && res.data.access_token) {
              sessionStorage.setItem("sb_access_token", res.data.access_token);
              sessionStorage.setItem(
                "sb_refresh_token",
                res.data.refresh_token,
              );
              sessionStorage.setItem("sb_user", JSON.stringify(res.data.user));
            }
            return res;
          });
      },

      // Logout (clear session)
      logout: function () {
        sessionStorage.removeItem("sb_access_token");
        sessionStorage.removeItem("sb_refresh_token");
        sessionStorage.removeItem("sb_user");
        sessionStorage.removeItem("sb_user_role");
      },

      // Get current user from session
      getCurrentUser: function () {
        var userStr = sessionStorage.getItem("sb_user");
        return userStr ? JSON.parse(userStr) : null;
      },

      // Check if user is logged in
      isLoggedIn: function () {
        return !!sessionStorage.getItem("sb_access_token");
      },

      // Get stored access token
      getToken: function () {
        return sessionStorage.getItem("sb_access_token");
      },
    };
  },
]);
