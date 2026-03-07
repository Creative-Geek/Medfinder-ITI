// HTTP interceptor: injects Supabase auth headers + handles 401 token refresh
angular.module("medfinderApp").config([
  "$httpProvider",
  function ($httpProvider) {
    $httpProvider.interceptors.push([
      "$q",
      "$injector",
      "SUPABASE",
      function ($q, $injector, SUPABASE) {
        var isRefreshing = false;
        var refreshQueue = [];

        return {
          request: function (config) {
            // Only attach headers to Supabase requests
            if (config.url && config.url.indexOf(SUPABASE.URL) === 0) {
              config.headers = config.headers || {};
              config.headers["apikey"] = SUPABASE.KEY;
              config.headers["Content-Type"] = "application/json";

              // Attach bearer token if user is logged in
              var token = localStorage.getItem("sb_access_token");
              if (token) {
                config.headers["Authorization"] = "Bearer " + token;
              } else {
                config.headers["Authorization"] = "Bearer " + SUPABASE.KEY;
              }
            }
            return config;
          },

          responseError: function (rejection) {
            // Only handle 401s for Supabase requests (not auth endpoints themselves)
            if (
              rejection.status === 401 &&
              rejection.config &&
              rejection.config.url &&
              rejection.config.url.indexOf(SUPABASE.URL) === 0 &&
              rejection.config.url.indexOf("/auth/v1/token") === -1 &&
              !rejection.config._retried
            ) {
              var deferred = $q.defer();

              if (isRefreshing) {
                // Queue requests while refresh is in progress
                refreshQueue.push({
                  config: rejection.config,
                  deferred: deferred,
                });
              } else {
                isRefreshing = true;
                // Lazy-inject AuthService to avoid circular dependency
                var AuthService = $injector.get("AuthService");
                var $http = $injector.get("$http");

                AuthService.refreshToken()
                  .then(function (newToken) {
                    // Retry the original request with new token
                    rejection.config.headers["Authorization"] =
                      "Bearer " + newToken;
                    rejection.config._retried = true;
                    deferred.resolve($http(rejection.config));

                    // Retry all queued requests
                    angular.forEach(refreshQueue, function (item) {
                      item.config.headers["Authorization"] =
                        "Bearer " + newToken;
                      item.config._retried = true;
                      item.deferred.resolve($http(item.config));
                    });
                  })
                  .catch(function () {
                    // Refresh failed -- reject everything
                    deferred.reject(rejection);
                    angular.forEach(refreshQueue, function (item) {
                      item.deferred.reject(rejection);
                    });
                  })
                  .finally(function () {
                    isRefreshing = false;
                    refreshQueue = [];
                  });
              }

              return deferred.promise;
            }

            return $q.reject(rejection);
          },
        };
      },
    ]);
  },
]);
