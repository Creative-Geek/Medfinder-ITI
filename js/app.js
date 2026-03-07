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
    var ADMIN_EMAIL = "ahmedtaha1234@gmail.com";

    var VIEW_EXIT_DURATION = 180;
    var VIEW_ENTER_DURATION = 220;
    var activeViewTransitionId = 0;
    var activeViewTransitionStartedAt = 0;
    var hasRenderedInitialView = false;
    var viewEnterTimer = null;
    var viewCleanupTimer = null;

    function getViewStageEl() {
      return document.querySelector(".app-shell__view-stage");
    }

    function clearViewTransitionTimers() {
      clearTimeout(viewEnterTimer);
      clearTimeout(viewCleanupTimer);
      viewEnterTimer = null;
      viewCleanupTimer = null;
    }

    function setViewTransitionState(state) {
      var stageEl = getViewStageEl();
      if (!stageEl) return;

      stageEl.classList.remove(
        "app-shell__view-stage--leaving",
        "app-shell__view-stage--entering",
      );

      if (state) {
        stageEl.classList.add("app-shell__view-stage--" + state);
      }
    }

    function beginViewTransition() {
      activeViewTransitionId += 1;
      activeViewTransitionStartedAt = Date.now();
      clearViewTransitionTimers();

      if (!hasRenderedInitialView) {
        return activeViewTransitionId;
      }

      setViewTransitionState("leaving");
      return activeViewTransitionId;
    }

    function enterViewTransition(transitionId) {
      if (transitionId !== activeViewTransitionId) return;

      setViewTransitionState("entering");
      viewCleanupTimer = setTimeout(function () {
        if (transitionId !== activeViewTransitionId) return;
        setViewTransitionState(null);
      }, VIEW_ENTER_DURATION);
    }

    $rootScope.$on("$viewContentLoaded", function () {
      var transitionId = activeViewTransitionId;
      var remainingExitTime = 0;

      if (hasRenderedInitialView) {
        remainingExitTime = Math.max(
          VIEW_EXIT_DURATION - (Date.now() - activeViewTransitionStartedAt),
          0,
        );
      }

      clearViewTransitionTimers();
      viewEnterTimer = setTimeout(function () {
        window.scrollTo(0, 0);
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            enterViewTransition(transitionId);
            hasRenderedInitialView = true;
          });
        });
      }, remainingExitTime);

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
      var currentUser = AuthService.getCurrentUser();
      var storedRole = localStorage.getItem("sb_user_role");
      var derivedRole = null;

      if (currentUser) {
        derivedRole =
          currentUser.email === ADMIN_EMAIL ? "admin" : storedRole || "user";
      }

      $rootScope.isLoggedIn = AuthService.isLoggedIn();
      $rootScope.currentUser = currentUser;
      $rootScope.userRole = derivedRole;
      $rootScope.isAdmin = derivedRole === "admin";
    }

    syncAuthState();

    // Logout action (called from navbar dropdown)
    $rootScope.logout = function () {
      var AuthService = $injector.get("AuthService");
      var WishlistService = $injector.get("WishlistService");
      AuthService.logout();
      WishlistService.clearCache();
      syncAuthState();
      window.location.hash = "#!/login";
    };

    // Route guard: check access levels + keep auth state fresh
    $rootScope.$on("$routeChangeStart", function (event, next) {
      syncAuthState();

      var access = (next && next.$$route && next.$$route.access) || "guest";

      var token = localStorage.getItem("sb_access_token");
      var userRole =
        $rootScope.userRole || localStorage.getItem("sb_user_role");

      if (access === "user" && !token) {
        event.preventDefault();
        window.location.hash = "#!/login";
        return;
      }

      if (access === "admin" && userRole !== "admin") {
        event.preventDefault();
        window.location.hash = "#!/";
        return;
      }

      beginViewTransition();
    });

    $rootScope.$on("$routeChangeError", function () {
      clearViewTransitionTimers();
      setViewTransitionState(null);
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
