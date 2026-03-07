// Medfinder AngularJS Application
var app = angular.module("medfinderApp", ["ngRoute"]);

// Re-initialize Lucide icons after each view loads
app.run([
  "$rootScope",
  "$injector",
  function ($rootScope, $injector) {
    $rootScope.$on("$viewContentLoaded", function () {
      if (typeof lucide !== "undefined") {
        setTimeout(function () {
          lucide.createIcons();
        }, 50);
      }
    });

    // Proactive token refresh on app startup
    var token = localStorage.getItem("sb_access_token");
    if (token) {
      try {
        var AuthService = $injector.get("AuthService");
        if (AuthService.isTokenExpired()) {
          AuthService.refreshToken().catch(function () {
            // Silently fail -- interceptor will handle 401s
          });
        }
      } catch (e) {
        // Service not ready yet, interceptor will handle it
      }
    }

    // -- Global auth state (used by navbar) --
    function syncAuthState() {
      var AuthService = $injector.get("AuthService");
      $rootScope.isLoggedIn = AuthService.isLoggedIn();
      $rootScope.currentUser = AuthService.getCurrentUser();
    }

    syncAuthState();

    // Logout action (called from navbar dropdown)
    $rootScope.logout = function () {
      var AuthService = $injector.get("AuthService");
      AuthService.logout();
      syncAuthState();
      window.location.hash = "#!/login";
    };

    // Route guard: check access levels + keep auth state fresh
    $rootScope.$on("$routeChangeStart", function (event, next) {
      syncAuthState();

      var access = next.$$route && next.$$route.access;
      if (!access || access === "guest") return;

      var token = localStorage.getItem("sb_access_token");
      var userRole = localStorage.getItem("sb_user_role");

      if (access === "user" && !token) {
        event.preventDefault();
        window.location.hash = "#!/login";
      }

      if (access === "admin" && userRole !== "admin") {
        event.preventDefault();
        window.location.hash = "#!/";
      }
    });

    // Navigation categories (used by navbar, always available)
    $rootScope.navCategories = [
      { label: "الأدوية", value: "الأدوية" },
      { label: "الحماية من الفيروسات", value: "الحماية من الفيروسات" },
      { label: "منتجات المرأة", value: "منتجات المرأة" },
      { label: "الأم و الطفل", value: "الأم و الطفل" },
      { label: "العناية بالبشرة و الشعر", value: "العناية بالبشرة و الشعر" },
      { label: "العناية بالاسنان", value: "العناية بالاسنان" },
      { label: "منتجات الرجال", value: "منتجات الرجال" },
    ];
  },
]);
