// Admin orders controller -- order list, status management, printable receipt
angular.module("medfinderApp").controller("AdminOrdersController", [
  "$scope",
  "$routeParams",
  "$timeout",
  "AdminService",
  "OrderService",
  function ($scope, $routeParams, $timeout, AdminService, OrderService) {
    $scope.pageTitle = "ادارة الطلبات";

    // State
    $scope.allOrders = [];
    $scope.filteredOrders = [];
    $scope.loading = true;
    $scope.searchQuery = "";
    $scope.activeTab = "all";
    $scope.dateFilter = "all"; // 'all', 'today', 'week', 'month'
    $scope.printOrder = null;
    $scope.today = new Date();

    // Status labels
    $scope.statusLabels = {
      pending: "قيد الانتظار",
      processing: "قيد التجهيز",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };

    // ════════════════════════════════════════
    // Load Orders
    // ════════════════════════════════════════
    function loadOrders() {
      $scope.loading = true;
      AdminService.getAllOrders()
        .then(function (res) {
          $scope.allOrders = res.data || [];

          // Check if we navigated via "View" from dashboard
          if ($routeParams.id) {
            var targetId = parseInt($routeParams.id, 10);
            var found = $scope.allOrders.find(function (o) {
              return o.id === targetId;
            });

            if (found) {
              $scope.activeTab = "all";
              $scope.dateFilter = "all";
              found._expanded = true;

              // Optionally scroll to it
              $timeout(function () {
                var el = document.getElementById("order-row-" + targetId);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  el.classList.add("admin-highlight");
                  setTimeout(function () {
                    el.classList.remove("admin-highlight");
                  }, 2000);
                }
              }, 100);
            }
          }

          applyFilters();
        })
        .catch(function (err) {
          console.error("Failed to load orders:", err);
          $scope.allOrders = [];
        })
        .finally(function () {
          $scope.loading = false;
          setTimeout(function () {
            medfinderRefreshViewIcons();
          }, 100);
        });
    }

    // ════════════════════════════════════════
    // Filter
    // ════════════════════════════════════════
    $scope.countByStatus = function (status) {
      return $scope.allOrders.filter(function (o) {
        return o.status === status;
      }).length;
    };

    $scope.setTab = function (tab) {
      $scope.activeTab = tab;
      applyFilters();
    };

    $scope.setDateFilter = function (filter) {
      $scope.dateFilter = filter;
      applyFilters();
    };

    $scope.applyFilters = applyFilters;

    function applyFilters() {
      var orders = $scope.allOrders;

      // Status tab
      if ($scope.activeTab !== "all") {
        orders = orders.filter(function (o) {
          return o.status === $scope.activeTab;
        });
      }

      // Date Filter
      if ($scope.dateFilter !== "all" && orders.length > 0) {
        var now = new Date();
        var todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        ).getTime();

        var weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        var weekTime = weekStart.getTime();

        var monthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).getTime();

        orders = orders.filter(function (o) {
          if (!o.created_at) return false;
          var t = new Date(o.created_at).getTime();
          if ($scope.dateFilter === "today") return t >= todayStart;
          if ($scope.dateFilter === "week") return t >= weekTime;
          if ($scope.dateFilter === "month") return t >= monthStart;
          return true;
        });
      }

      // Search
      var q = ($scope.searchQuery || "").toLowerCase().trim();
      if (q) {
        orders = orders.filter(function (o) {
          var name = (o.profiles && o.profiles.full_name) || "";
          var email = (o.profiles && o.profiles.email) || "";
          return (
            name.toLowerCase().indexOf(q) !== -1 ||
            email.toLowerCase().indexOf(q) !== -1 ||
            String(o.id).indexOf(q) !== -1
          );
        });
      }

      $scope.filteredOrders = orders;
    }

    // ════════════════════════════════════════
    // Expand / Collapse
    // ════════════════════════════════════════
    $scope.toggleDetails = function (order) {
      order._expanded = !order._expanded;
      // Re-init icons after expand
      if (order._expanded) {
        setTimeout(function () {
          medfinderRefreshViewIcons();
        }, 50);
      }
    };

    // ════════════════════════════════════════
    // Update Status
    // ════════════════════════════════════════
    $scope.updateStatus = function (order) {
      OrderService.updateStatus(order.id, order.status)
        .then(function () {
          // Success -- status already updated via ng-model
          applyFilters();
        })
        .catch(function (err) {
          console.error("Status update failed:", err);
          // Revert by reloading
          loadOrders();
        });
    };

    // ════════════════════════════════════════
    // Print Receipt
    // ════════════════════════════════════════
    $scope.printReceipt = function (order) {
      $scope.printOrder = order;
      $scope.today = new Date();

      // Wait for Angular to render the receipt div, then print
      setTimeout(function () {
        window.print();
      }, 200);
    };

    // ════════════════════════════════════════
    // Init
    // ════════════════════════════════════════
    loadOrders();
  },
]);
