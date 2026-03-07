// Medfinder AngularJS Application
var app = angular.module("medfinderApp", ["ngRoute"]);

// Highlight filter: wraps matched substring in <mark>
app.filter("highlight", [
  "$sce",
  function ($sce) {
    return function (text, query) {
      if (!text || !query) return text;
      var escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      var re = new RegExp("(" + escaped + ")", "gi");
      var result = String(text).replace(
        re,
        '<mark style="background:#ffe5cc;color:#f99d1c;padding:0 1px;border-radius:2px">$1</mark>',
      );
      return $sce.trustAsHtml(result);
    };
  },
]);

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

    // -- Global search (called from navbar search bar) --
    $rootScope.searchQuery = "";
    $rootScope.searchResults = [];
    $rootScope.searchDropdownOpen = false;

    var _searchCache = null;
    var _searchTimer = null;

    // Full-page search (Enter key)
    $rootScope.doSearch = function () {
      var $location = $injector.get("$location");
      var query = ($rootScope.searchQuery || "").trim();
      $rootScope.searchDropdownOpen = false;
      if (query) {
        $location.path("/shop").search({ search: query });
      } else {
        $location.path("/shop").search({});
      }
    };

    // Lazy-fetch all products once for live search
    function getSearchProducts() {
      if (_searchCache) {
        var $q = $injector.get("$q");
        return $q.resolve(_searchCache);
      }
      var $http = $injector.get("$http");
      var SUPABASE = $injector.get("SUPABASE");
      return $http
        .get(
          SUPABASE.REST_URL +
            "/products?select=id,name_ar,name_en,brand,category,price,image_url&order=id",
        )
        .then(function (res) {
          _searchCache = res.data || [];
          return _searchCache;
        })
        .catch(function () {
          _searchCache = [];
          return [];
        });
    }

    // Live search: debounced, filters client-side
    $rootScope.onSearchInput = function () {
      var query = ($rootScope.searchQuery || "").trim();
      if (!query || query.length < 2) {
        $rootScope.searchResults = [];
        $rootScope.searchDropdownOpen = false;
        return;
      }

      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(function () {
        getSearchProducts().then(function (products) {
          var q = query.toLowerCase();
          var filtered = products
            .filter(function (p) {
              return (
                (p.name_ar && p.name_ar.toLowerCase().indexOf(q) !== -1) ||
                (p.name_en && p.name_en.toLowerCase().indexOf(q) !== -1) ||
                (p.brand && p.brand.toLowerCase().indexOf(q) !== -1)
              );
            })
            .slice(0, 6);

          $rootScope.searchResults = filtered;
          $rootScope.searchDropdownOpen =
            filtered.length > 0 || query.length >= 2;
          $rootScope.$applyAsync();
        });
      }, 200);
    };

    // Close dropdown
    $rootScope.closeSearchDropdown = function () {
      $rootScope.searchDropdownOpen = false;
    };

    // Navigate to product from dropdown
    $rootScope.goToProduct = function (id) {
      var $location = $injector.get("$location");
      $rootScope.searchDropdownOpen = false;
      $location.path("/product/" + id);
    };

    // Close dropdown on click outside (uses event delegation)
    document.addEventListener(
      "click",
      function (e) {
        if (!e.target.closest(".navbar-search-wrapper")) {
          $rootScope.$applyAsync(function () {
            $rootScope.searchDropdownOpen = false;
          });
        }
      },
      true,
    );

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
