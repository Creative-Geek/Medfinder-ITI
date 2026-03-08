// Auth service -- Supabase Auth REST API (email/password only)
angular.module("medfinderApp").factory("AuthService", [
  "$http",
  "$q",
  "SUPABASE",
  function ($http, $q, SUPABASE) {
    var AUTH = SUPABASE.AUTH_URL;
    var REST = SUPABASE.REST_URL;

    function clearStoredSession() {
      localStorage.removeItem("sb_access_token");
      localStorage.removeItem("sb_refresh_token");
      localStorage.removeItem("sb_user");
      localStorage.removeItem("sb_user_role");
    }

    function storeAuthNotice(message) {
      try {
        sessionStorage.setItem("sb_auth_notice", message);
      } catch (e) {}
    }

    function getCurrentUser() {
      var userStr = localStorage.getItem("sb_user");
      return userStr ? JSON.parse(userStr) : null;
    }

    function requestCurrentProfile(selectClause) {
      var currentUser = getCurrentUser();

      return $http.get(
        REST + "/profiles?id=eq." + currentUser.id + "&select=" + selectClause,
        {
          headers: { Accept: "application/vnd.pgrst.object+json" },
        },
      );
    }

    function isMissingSuspensionFieldError(err) {
      var message =
        err && err.data && err.data.message ? String(err.data.message) : "";

      return (
        err && err.status === 400 && message.indexOf("is_suspended") !== -1
      );
    }

    function fetchCurrentProfileStatus() {
      var currentUser = getCurrentUser();

      if (!currentUser || !currentUser.id) {
        return $q.reject({ code: "NO_CURRENT_USER" });
      }

      return requestCurrentProfile("id,is_admin,is_suspended").catch(
        function (err) {
          if (!isMissingSuspensionFieldError(err)) {
            return $q.reject(err);
          }

          return requestCurrentProfile("id,is_admin").then(function (res) {
            res.data = angular.extend({}, res.data || {}, {
              is_suspended: false,
            });
            return res;
          });
        },
      );
    }

    // -- Token expiry check --
    // Returns true if token is expired or expires within 5 minutes
    function isTokenExpired() {
      var token = localStorage.getItem("sb_access_token");
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
      var refreshTok = localStorage.getItem("sb_refresh_token");
      if (!refreshTok) {
        return $q.reject("No refresh token");
      }

      return $http
        .post(AUTH + "/token?grant_type=refresh_token", {
          refresh_token: refreshTok,
        })
        .then(function (res) {
          if (res.data && res.data.access_token) {
            localStorage.setItem("sb_access_token", res.data.access_token);
            localStorage.setItem("sb_refresh_token", res.data.refresh_token);
            localStorage.setItem("sb_user", JSON.stringify(res.data.user));
          }
          return res.data.access_token;
        })
        .catch(function (err) {
          // Refresh failed -- clear session, user must log in again
          clearStoredSession();
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
              localStorage.setItem("sb_access_token", res.data.access_token);
              localStorage.setItem("sb_refresh_token", res.data.refresh_token);
              localStorage.setItem("sb_user", JSON.stringify(res.data.user));
            }
            return res;
          });
      },

      // Logout (clear session)
      logout: function () {
        clearStoredSession();
      },

      // Get current user from session
      getCurrentUser: function () {
        return getCurrentUser();
      },

      // Check if user is logged in
      isLoggedIn: function () {
        return !!localStorage.getItem("sb_access_token");
      },

      // Get stored access token
      getToken: function () {
        return localStorage.getItem("sb_access_token");
      },

      // Check if token is expired or about to expire
      isTokenExpired: isTokenExpired,

      // Refresh the access token
      refreshToken: refreshToken,

      // Ensure a valid token -- refresh if needed
      ensureValidToken: function () {
        if (!localStorage.getItem("sb_access_token")) {
          return $q.reject("Not logged in");
        }
        if (isTokenExpired()) {
          return refreshToken();
        }
        return $q.resolve(localStorage.getItem("sb_access_token"));
      },

      ensureAccountActive: function (options) {
        var opts = angular.extend(
          {
            allowOnError: true,
            redirectOnSuspended: true,
          },
          options || {},
        );

        if (!localStorage.getItem("sb_access_token")) {
          return $q.resolve(null);
        }

        return fetchCurrentProfileStatus()
          .then(function (res) {
            var profile = res.data || null;

            if (profile) {
              localStorage.setItem(
                "sb_user_role",
                profile.is_admin ? "admin" : "user",
              );
            }

            if (profile && profile.is_suspended) {
              storeAuthNotice(
                "تم إيقاف هذا الحساب مؤقتًا. يرجى التواصل مع الإدارة.",
              );
              clearStoredSession();

              return $q.reject({
                code: "SUSPENDED",
                profile: profile,
              });
            }

            return profile;
          })
          .catch(function (err) {
            if (err && err.code === "SUSPENDED") {
              if (opts.redirectOnSuspended && typeof window !== "undefined") {
                window.location.hash = "#!/login";
              }
              return $q.reject(err);
            }

            if (err && err.status === 406) {
              return null;
            }

            if (opts.allowOnError) {
              return null;
            }

            return $q.reject(err);
          });
      },
    };
  },
]);
