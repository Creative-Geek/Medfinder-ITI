// HTTP interceptor: injects Supabase auth headers into every $http request
angular.module("medfinderApp").config([
  "$httpProvider",
  function ($httpProvider) {
    $httpProvider.interceptors.push([
      "SUPABASE",
      function (SUPABASE) {
        return {
          request: function (config) {
            // Only attach headers to Supabase requests
            if (config.url && config.url.indexOf(SUPABASE.URL) === 0) {
              config.headers = config.headers || {};
              config.headers["apikey"] = SUPABASE.KEY;
              config.headers["Content-Type"] = "application/json";

              // Attach bearer token if user is logged in
              var token = sessionStorage.getItem("sb_access_token");
              if (token) {
                config.headers["Authorization"] = "Bearer " + token;
              } else {
                config.headers["Authorization"] = "Bearer " + SUPABASE.KEY;
              }
            }
            return config;
          },
        };
      },
    ]);
  },
]);
