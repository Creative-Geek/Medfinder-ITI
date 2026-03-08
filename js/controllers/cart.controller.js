// Cart/Checkout controller
angular.module("medfinderApp").controller("CartController", [
  "$scope",
  "$location",
  "$timeout",
  "CartService",
  "OrderService",
  "AuthService",
  "ProductService",
  "SUPABASE",
  "$http",
  function (
    $scope,
    $location,
    $timeout,
    CartService,
    OrderService,
    AuthService,
    ProductService,
    SUPABASE,
    $http,
  ) {
    // -- State --
    $scope.step = "cart"; // 'cart', 'checkout', 'success'
    $scope.cartItems = [];
    $scope.subtotal = 0;
    $scope.shippingCost = 0;
    $scope.total = 0;
    $scope.loading = false;
    $scope.stockError = "";
    $scope.orderId = null;

    // Checkout form
    $scope.checkout = {
      fullName: "",
      phone: "",
      address: "",
      city: "",
      governorate: "",
    };
    $scope.formErrors = {};

    // Shipping config
    var SHIPPING_FLAT = 30;
    var FREE_SHIPPING_THRESHOLD = 500;

    // -- Governorates list --
    $scope.governorates = [
      "القاهرة",
      "الجيزة",
      "الاسكندرية",
      "الدقهلية",
      "الشرقية",
      "القليوبية",
      "الغربية",
      "المنوفية",
      "البحيرة",
      "كفر الشيخ",
      "دمياط",
      "بورسعيد",
      "الاسماعيلية",
      "السويس",
      "البحر الاحمر",
      "اسوان",
      "الاقصر",
      "سوهاج",
      "اسيوط",
      "المنيا",
      "بنى سويف",
      "الفيوم",
      "مطروح",
      "الوادى الجديد",
      "شمال سيناء",
      "جنوب سيناء",
      "قنا",
    ];

    // -- Reinitialize Lucide icons --
    function refreshIcons() {
      $timeout(function () {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      }, 50);
    }

    // -- Load cart items --
    function loadCart() {
      $scope.cartItems = CartService.getItems();
      calculateTotals();
      refreshIcons();
    }

    // -- Calculate totals --
    function calculateTotals() {
      $scope.subtotal = $scope.cartItems.reduce(function (sum, item) {
        return sum + item.price * item.qty;
      }, 0);
      $scope.shippingCost =
        $scope.subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
      $scope.total = $scope.subtotal + $scope.shippingCost;
    }

    // -- Qty stepper --
    // -- Stepper callback: qty changed via directive --
    $scope.onItemQtyChange = function (item, qty) {
      CartService.updateQty(item.id, qty);
      item.qty = qty;
      calculateTotals();
    };

    $scope.removeItem = function (item) {
      CartService.removeItem(item.id);
      loadCart();
    };

    // -- Line total for an item --
    $scope.lineTotal = function (item) {
      return item.price * item.qty;
    };

    // -- Navigate to shop --
    $scope.goToShop = function () {
      $location.path("/shop");
    };

    // -- Proceed to checkout --
    $scope.goToCheckout = function () {
      $scope.stockError = "";
      $scope.step = "checkout";

      // Pre-fill name from user profile if available
      var user = AuthService.getCurrentUser();
      if (user && user.user_metadata && user.user_metadata.full_name) {
        $scope.checkout.fullName = user.user_metadata.full_name;
      }

      refreshIcons();
    };

    // -- Back to cart --
    $scope.goBackToCart = function () {
      $scope.step = "cart";
      $scope.formErrors = {};
      refreshIcons();
    };

    // -- Per-field checkout validation --
    function validateCheckoutField(field) {
      var f = $scope.checkout;
      var errors = $scope.formErrors;

      if (field === "fullName") {
        if (!f.fullName || !f.fullName.trim()) {
          errors.fullName = "يرجى إدخال الاسم بالكامل";
        } else {
          delete errors.fullName;
        }
      }

      if (field === "phone") {
        if (!f.phone || !f.phone.trim()) {
          errors.phone = "يرجى إدخال رقم الهاتف";
        } else if (!/^(010|011|012|015)\d{8}$/.test(f.phone.trim())) {
          errors.phone = "يرجى إدخال رقم هاتف مصرى صحيح (11 رقم)";
        } else {
          delete errors.phone;
        }
      }

      if (field === "address") {
        if (!f.address || !f.address.trim()) {
          errors.address = "يرجى إدخال العنوان";
        } else {
          delete errors.address;
        }
      }

      if (field === "governorate") {
        if (!f.governorate) {
          errors.governorate = "يرجى اختيار المحافظة";
        } else {
          delete errors.governorate;
        }
      }
    }

    $scope.onCheckoutBlur = function (field) {
      validateCheckoutField(field);
    };

    // -- Full checkout validation (on submit) --
    function validateForm() {
      $scope.formErrors = {};
      validateCheckoutField("fullName");
      validateCheckoutField("phone");
      validateCheckoutField("address");
      validateCheckoutField("governorate");
      return Object.keys($scope.formErrors).length === 0;
    }

    // -- Place order --
    $scope.placeOrder = function () {
      if (!validateForm()) return;

      $scope.loading = true;
      $scope.stockError = "";

      var user = AuthService.getCurrentUser();
      if (!user) {
        $location.path("/login");
        return;
      }

      var cartItems = CartService.getItems();

      // Step 1: Validate stock freshness
      var productIds = cartItems
        .map(function (i) {
          return i.id;
        })
        .join(",");

      $http
        .get(
          SUPABASE.REST_URL +
            "/products?id=in.(" +
            productIds +
            ")&select=id,name_ar,stock",
        )
        .then(function (res) {
          var freshProducts = res.data;
          var stockMap = {};
          freshProducts.forEach(function (p) {
            stockMap[p.id] = p;
          });

          // Check for insufficient stock
          var insufficientItems = cartItems.filter(function (item) {
            var live = stockMap[item.id];
            return live != null && item.qty > live.stock;
          });

          if (insufficientItems.length > 0) {
            var names = insufficientItems
              .map(function (item) {
                var live = stockMap[item.id];
                return '"' + item.name_ar + '" (المتاح: ' + live.stock + ")";
              })
              .join("، ");
            $scope.stockError = "الكمية المطلوبة غير متوفرة: " + names;
            $scope.loading = false;
            $scope.step = "cart";
            refreshIcons();
            return;
          }

          // Step 2: Create order
          var shippingParts = [$scope.checkout.address, $scope.checkout.city];
          if ($scope.checkout.governorate) {
            shippingParts.push($scope.checkout.governorate);
          }

          var orderData = {
            user_id: user.id,
            total: $scope.total,
            status: "pending",
            shipping_address: shippingParts.join("، "),
          };

          return OrderService.place(orderData);
        })
        .then(function (res) {
          if (!res) return; // stock error already handled

          var order = res.data[0] || res.data;
          $scope.orderId = order.id;

          // Step 3: Insert order items
          var orderItems = cartItems.map(function (item) {
            return {
              order_id: order.id,
              product_id: item.id,
              quantity: item.qty,
              unit_price: item.price,
            };
          });

          return OrderService.addItems(orderItems).then(function () {
            // Step 4: Decrement stock for each item
            var stockPromises = cartItems.map(function (item) {
              return OrderService.decrementStock(item.id, item.qty);
            });
            return Promise.all(stockPromises);
          });
        })
        .then(function (result) {
          if (!result) return; // stock error path

          // Success: clear cart, show confirmation
          CartService.clearCart();
          $scope.step = "success";
          $scope.loading = false;
          refreshIcons();
        })
        .catch(function (err) {
          console.error("Order placement failed:", err);
          $scope.stockError =
            "حدث خطأ اثناء تنفيذ الطلب. يرجى المحاولة مرة اخرى.";
          $scope.loading = false;
          refreshIcons();
        });
    };

    // -- Init --
    loadCart();
  },
]);
