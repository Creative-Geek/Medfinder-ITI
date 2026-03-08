// Admin customers controller -- customer list with order history
angular.module("medfinderApp").controller("AdminCustomersController", [
  "$scope",
  "AdminService",
  function ($scope, AdminService) {
    $scope.pageTitle = "ادارة العملاء";

    // State
    $scope.allCustomers = [];
    $scope.filteredCustomers = [];
    $scope.loading = true;
    $scope.searchQuery = "";

    // Status labels
    $scope.statusLabels = {
      pending: "قيد الانتظار",
      processing: "قيد التجهيز",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };

    // ════════════════════════════════════════
    // Load Customers
    // ════════════════════════════════════════
    function loadCustomers() {
      $scope.loading = true;
      AdminService.getAllCustomers()
        .then(function (res) {
          $scope.allCustomers = res.data || [];
          applyFilters();
        })
        .catch(function (err) {
          console.error("Failed to load customers:", err);
          $scope.allCustomers = [];
        })
        .finally(function () {
          $scope.loading = false;
          setTimeout(function () {
            if (typeof lucide !== "undefined") lucide.createIcons();
          }, 100);
        });
    }

    // ════════════════════════════════════════
    // Filter
    // ════════════════════════════════════════
    $scope.applyFilters = applyFilters;

    function applyFilters() {
      var customers = $scope.allCustomers;

      var q = ($scope.searchQuery || "").toLowerCase().trim();
      if (q) {
        customers = customers.filter(function (c) {
          return (
            (c.full_name && c.full_name.toLowerCase().indexOf(q) !== -1) ||
            (c.email && c.email.toLowerCase().indexOf(q) !== -1) ||
            (c.phone && c.phone.indexOf(q) !== -1)
          );
        });
      }

      $scope.filteredCustomers = customers;
    }

    // ════════════════════════════════════════
    // Expand / Collapse
    // ════════════════════════════════════════
    $scope.toggleCustomer = function (customer) {
      customer._expanded = !customer._expanded;

      if (customer._expanded && !customer._ordersLoaded) {
        customer._loadingOrders = true;
        customer._orders = [];

        AdminService.getCustomerOrders(customer.id)
          .then(function (res) {
            customer._orders = res.data || [];
            customer._ordersLoaded = true;
          })
          .catch(function (err) {
            console.error("Failed to load customer orders:", err);
            customer._orders = [];
          })
          .finally(function () {
            customer._loadingOrders = false;
            setTimeout(function () {
              if (typeof lucide !== "undefined") lucide.createIcons();
            }, 50);
          });
      }

      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 50);
    };

    // ════════════════════════════════════════
    // Init
    // ════════════════════════════════════════
    loadCustomers();
  },
]);
