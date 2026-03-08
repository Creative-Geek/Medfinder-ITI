// Admin customers controller -- customer list with order history
angular.module("medfinderApp").controller("AdminCustomersController", [
  "$scope",
  "AdminService",
  "$window",
  function ($scope, AdminService, $window) {
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

    function refreshIcons(delay) {
      setTimeout(function () {
        medfinderRefreshViewIcons();
      }, delay || 50);
    }

    function normalizeCustomer(customer) {
      customer.is_suspended = !!customer.is_suspended;
      customer.suspended_at = customer.suspended_at || null;
      customer._actionError = "";
      customer._statusBusy = false;
      return customer;
    }

    // ════════════════════════════════════════
    // Load Customers
    // ════════════════════════════════════════
    function loadCustomers() {
      $scope.loading = true;
      AdminService.getAllCustomers()
        .then(function (res) {
          $scope.allCustomers = (res.data || [])
            .filter(function (customer) {
              return !customer.is_admin;
            })
            .map(normalizeCustomer);
          applyFilters();
        })
        .catch(function (err) {
          console.error("Failed to load customers:", err);
          $scope.allCustomers = [];
        })
        .finally(function () {
          $scope.loading = false;
          refreshIcons(100);
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

    $scope.getCustomerStatusLabel = function (customer) {
      return customer && customer.is_suspended ? "موقوف" : "نشط";
    };

    $scope.getCustomerStatusClass = function (customer) {
      return customer && customer.is_suspended ?
          "admin-badge--suspended"
        : "admin-badge--active";
    };

    function setCustomerSuspension(customer, isSuspended) {
      if (!customer || customer._statusBusy) return;

      customer._statusBusy = true;
      customer._actionError = "";

      AdminService.setCustomerSuspension(customer.id, isSuspended)
        .then(function (res) {
          var updated = res.data && res.data[0] ? res.data[0] : res.data || {};
          customer.is_suspended = !!updated.is_suspended;
          customer.suspended_at = updated.suspended_at || null;
        })
        .catch(function (err) {
          console.error("Failed to update customer suspension:", err);

          var message =
            err && err.data && err.data.message ? err.data.message : "";

          if (message.indexOf("own account") !== -1) {
            customer._actionError = "لا يمكنك إيقاف حسابك الحالي.";
            return;
          }

          if (message.indexOf("Admin accounts") !== -1) {
            customer._actionError = "لا يمكن إيقاف حسابات الإدارة.";
            return;
          }

          customer._actionError =
            isSuspended ?
              "تعذر إيقاف الحساب. حاول مرة أخرى."
            : "تعذر إعادة التفعيل. حاول مرة أخرى.";
        })
        .finally(function () {
          customer._statusBusy = false;
          refreshIcons(50);
        });
    }

    $scope.suspendCustomer = function (customer, $event) {
      if ($event) $event.stopPropagation();
      if (!customer || customer._statusBusy) return;

      var confirmed = $window.confirm(
        "سيتم إيقاف هذا الحساب ولن يتمكن المستخدم من الدخول حتى تعيد تفعيله. هل تريد المتابعة؟",
      );

      if (!confirmed) return;
      setCustomerSuspension(customer, true);
    };

    $scope.reactivateCustomer = function (customer, $event) {
      if ($event) $event.stopPropagation();
      if (!customer || customer._statusBusy) return;

      var confirmed = $window.confirm(
        "سيتم إعادة تفعيل هذا الحساب والسماح للمستخدم بالوصول مرة أخرى. هل تريد المتابعة؟",
      );

      if (!confirmed) return;
      setCustomerSuspension(customer, false);
    };

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
            refreshIcons(50);
          });
      }

      refreshIcons(50);
    };

    // ════════════════════════════════════════
    // Init
    // ════════════════════════════════════════
    loadCustomers();
  },
]);
