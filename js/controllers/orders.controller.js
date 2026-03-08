// Orders/Profile controller
// Profile reads from auth.users (localStorage). Writes go to Supabase Auth
// REST (PUT /auth/v1/user), which triggers sync to profiles table via DB trigger.
angular.module("medfinderApp").controller("OrdersController", [
  "$scope",
  "$timeout",
  "$http",
  "AuthService",
  "OrderService",
  "SUPABASE",
  function ($scope, $timeout, $http, AuthService, OrderService, SUPABASE) {
    var user = AuthService.getCurrentUser();

    // -- State --
    $scope.profile = null;
    $scope.profileLoading = false; // instant from localStorage
    $scope.profileEditing = false;
    $scope.profileForm = {};
    $scope.profileSaving = false;
    $scope.profileSaveMsg = "";

    $scope.orders = [];
    $scope.ordersLoading = true;
    $scope.expandedOrderId = null;

    // -- Lucide icons refresh --
    function refreshIcons() {
      $timeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 50);
    }

    // -- Load Profile from auth user (instant, no DB call) --
    if (user) {
      var meta = user.user_metadata || {};
      $scope.profile = {
        email: user.email || "",
        full_name: meta.full_name || "",
        phone: user.phone || meta.phone || "",
        address: meta.address || "",
        created_at: user.created_at || "",
      };
      refreshIcons();

      // -- Load Orders with items --
      OrderService.getMyOrders(user.id)
        .then(function (res) {
          var orders = res.data || [];
          $scope.orders = orders;
          $scope.ordersLoading = false;
          refreshIcons();

          // For each order, load its items
          orders.forEach(function (order) {
            order._items = [];
            order._itemsLoading = true;
            OrderService.getById(order.id)
              .then(function (detailRes) {
                order._items = detailRes.data.order_items || [];
                order._itemsLoading = false;
              })
              .catch(function () {
                order._itemsLoading = false;
              });
          });
        })
        .catch(function () {
          $scope.ordersLoading = false;
          refreshIcons();
        });
    }

    // -- Profile editing --
    $scope.startEdit = function () {
      $scope.profileForm = {
        full_name: $scope.profile.full_name || "",
        phone: $scope.profile.phone || "",
        address: $scope.profile.address || "",
      };
      $scope.profileEditing = true;
      $scope.profileSaveMsg = "";
      refreshIcons();
    };

    $scope.cancelEdit = function () {
      $scope.profileEditing = false;
      $scope.profileSaveMsg = "";
      refreshIcons();
    };

    // -- Save profile via Supabase Auth REST (PUT /auth/v1/user) --
    // This updates user_metadata, which triggers the DB sync to profiles table
    $scope.saveProfile = function () {
      $scope.profileSaving = true;
      $scope.profileSaveMsg = "";

      var payload = {
        data: {
          full_name: $scope.profileForm.full_name,
          phone: $scope.profileForm.phone,
          address: $scope.profileForm.address,
        },
      };

      // If phone changed, also set top-level phone field
      if ($scope.profileForm.phone !== $scope.profile.phone) {
        payload.phone = $scope.profileForm.phone;
      }

      $http
        .put(SUPABASE.AUTH_URL + "/user", payload)
        .then(function (res) {
          var updatedUser = res.data;
          var updatedMeta = updatedUser.user_metadata || {};

          // Update local profile state
          $scope.profile.full_name = updatedMeta.full_name || "";
          $scope.profile.phone = updatedUser.phone || updatedMeta.phone || "";
          $scope.profile.address = updatedMeta.address || "";

          // Sync localStorage so navbar/other pages see updated data
          localStorage.setItem("sb_user", JSON.stringify(updatedUser));

          $scope.profileEditing = false;
          $scope.profileSaving = false;
          $scope.profileSaveMsg = "تم حفظ البيانات بنجاح";
          refreshIcons();
        })
        .catch(function () {
          $scope.profileSaving = false;
          $scope.profileSaveMsg = "حدث خطأ. يرجى المحاولة مرة اخرى.";
        });
    };

    // -- Order expansion --
    $scope.toggleOrder = function (orderId) {
      if ($scope.expandedOrderId === orderId) {
        $scope.expandedOrderId = null;
      } else {
        $scope.expandedOrderId = orderId;
      }
      refreshIcons();
    };

    // -- Status label mapping --
    $scope.statusLabel = function (status) {
      var map = {
        pending: "قيد الانتظار",
        processing: "جاري التجهيز",
        shipped: "تم الشحن",
        delivered: "تم التسليم",
        cancelled: "ملغى",
      };
      return map[status] || status;
    };

    $scope.statusClass = function (status) {
      var map = {
        pending: "order-status--pending",
        processing: "order-status--processing",
        shipped: "order-status--shipped",
        delivered: "order-status--delivered",
        cancelled: "order-status--cancelled",
      };
      return map[status] || "";
    };

    // -- Format date --
    $scope.formatDate = function (dateStr) {
      if (!dateStr) return "";
      var d = new Date(dateStr);
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };
  },
]);
