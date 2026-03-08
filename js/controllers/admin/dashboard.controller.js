// Admin dashboard controller -- KPI stats + recent orders
angular.module("medfinderApp").controller("AdminDashboardController", [
  "$scope",
  "AdminService",
  function ($scope, AdminService) {
    $scope.pageTitle = "لوحة التحكم";
    $scope.loading = true;
    $scope.stats = {};
    $scope.recentOrders = [];

    // Status labels (Arabic)
    $scope.statusLabels = {
      pending: "قيد الانتظار",
      processing: "قيد التجهيز",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };

    // Load stats
    AdminService.getStats()
      .then(function (stats) {
        $scope.stats = stats;
      })
      .catch(function (err) {
        console.error("Failed to load stats:", err);
        $scope.stats = {
          totalSales: 0,
          customerCount: 0,
          lowStockCount: 0,
          todayOrderCount: 0,
        };
      })
      .finally(function () {
        setTimeout(function () {
          if (typeof lucide !== "undefined") lucide.createIcons();
        }, 50);
      });

    // Load recent orders
    AdminService.getRecentOrders(10)
      .then(function (res) {
        $scope.recentOrders = res.data || [];
      })
      .catch(function (err) {
        console.error("Failed to load recent orders:", err);
        $scope.recentOrders = [];
      })
      .finally(function () {
        $scope.loading = false;
        setTimeout(function () {
          if (typeof lucide !== "undefined") lucide.createIcons();
        }, 100);
      });
  },
]);
