// Auth service -- Supabase Auth REST API (email/password only)
angular.module("medfinderApp").factory("AuthService", [
  "$http",
  "$q",
  "SUPABASE",
  function ($http, $q, SUPABASE) {
    var AUTH = SUPABASE.AUTH_URL;

    // -- Token expiry check --
    // Returns true if token is expired or expires within 5 minutes
    function isTokenExpired() {
      var token = sessionStorage.getItem("sb_access_token");
      if (!token) return true;

      try {
        var payload = JSON.parse(atob(token.split(".")[1]));
        var now = Math.floor(Date.now() / 1000);
        return !payload.exp || payload.exp - now < 300;
      } catch (e) {
        return true;
      }
    }

    // -- Refresh token --
    // Uses the refresh token to get a new access token
    function refreshToken() {
      var refreshTok = sessionStorage.getItem("sb_refresh_token");
      if (!refreshTok) {
        return $q.reject("No refresh token");
      }

      return $http
        .post(AUTH + "/token?grant_type=refresh_token", {
          refresh_token: refreshTok,
        })
        .then(function (res) {
          if (res.data && res.data.access_token) {
            sessionStorage.setItem("sb_access_token", res.data.access_token);
            sessionStorage.setItem("sb_refresh_token", res.data.refresh_token);
            sessionStorage.setItem("sb_user", JSON.stringify(res.data.user));
          }
          return res.data.access_token;
        })
        .catch(function (err) {
          // Refresh failed -- clear session, user must log in again
          sessionStorage.removeItem("sb_access_token");
          sessionStorage.removeItem("sb_refresh_token");
          sessionStorage.removeItem("sb_user");
          sessionStorage.removeItem("sb_user_role");
          return $q.reject(err);
        });
    }

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

      // Check if token is expired or about to expire
      isTokenExpired: isTokenExpired,

      // Refresh the access token
      refreshToken: refreshToken,

      // Ensure a valid token -- refresh if needed
      ensureValidToken: function () {
        if (!sessionStorage.getItem("sb_access_token")) {
          return $q.reject("Not logged in");
        }
        if (isTokenExpired()) {
          return refreshToken();
        }
        return $q.resolve(sessionStorage.getItem("sb_access_token"));
      },
    };
  },
]);
