// Medfinder AngularJS Application
var app = angular.module("medfinderApp", ["ngRoute"]);

// Re-initialize Lucide icons after each view loads
app.run([
  "$rootScope",
  function ($rootScope) {
    $rootScope.$on("$viewContentLoaded", function () {
      if (typeof lucide !== "undefined") {
        setTimeout(function () {
          lucide.createIcons();
        }, 50);
      }
    });

    // Route guard: check access levels
    $rootScope.$on("$routeChangeStart", function (event, next) {
      var access = next.$$route && next.$$route.access;
      if (!access || access === "guest") return;

      var token = sessionStorage.getItem("sb_access_token");
      var userRole = sessionStorage.getItem("sb_user_role");

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
