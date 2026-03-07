// Product detail controller
angular.module("medfinderApp").controller("ProductController", [
  "$scope",
  "$routeParams",
  "$location",
  "$timeout",
  "ProductService",
  "CartService",
  function (
    $scope,
    $routeParams,
    $location,
    $timeout,
    ProductService,
    CartService,
  ) {
    // -- State --
    $scope.loading = true;
    $scope.error = false;
    $scope.product = null;
    $scope.selectedImage = null;
    $scope.imageChanging = false; // for crossfade animation
    $scope.quantity = 0; // 0 means "not in cart yet"
    $scope.addedFeedback = false;

    // -- Reinitialize Lucide icons after Angular renders --
    function refreshIcons() {
      $timeout(function () {
        if (typeof lucide !== "undefined") {
          lucide.createIcons();
        }
      }, 50);
    }

    // -- Load product --
    ProductService.getById($routeParams.id)
      .then(function (response) {
        var product = response.data;
        $scope.product = product;
        $scope.selectedImage =
          product.image_url || (product.images && product.images[0]) || null;

        // Check if product is already in cart (persist stepper across page changes)
        var cartItems = CartService.getItems();
        var existing = cartItems.find(function (item) {
          return item.id === product.id;
        });
        if (existing) {
          $scope.quantity = existing.qty;
        }

        buildBreadcrumb(product);
        $scope.loading = false;
        refreshIcons();
      })
      .catch(function () {
        $scope.error = true;
        $scope.loading = false;
        refreshIcons();
      });

    // -- Build breadcrumb from product data --
    function buildBreadcrumb(product) {
      var crumbs = [{ label: "الرئيسية", href: "#!/" }];

      if (product.type) {
        crumbs.push({
          label: product.type,
          href: "#!/shop?type=" + encodeURIComponent(product.type),
        });
      }

      if (product.category && product.category.length > 0) {
        crumbs.push({
          label: product.category[0],
          href:
            "#!/shop?type=" +
            encodeURIComponent(product.type || "") +
            "&category=" +
            encodeURIComponent(product.category[0]),
        });
      }

      crumbs.push({ label: product.name_ar, href: null });

      $scope.breadcrumb = crumbs;
    }

    // -- Gallery: select thumbnail with crossfade --
    $scope.selectImage = function (url) {
      if (url === $scope.selectedImage) return;
      $scope.imageChanging = true;
      $timeout(function () {
        $scope.selectedImage = url;
        $scope.imageChanging = false;
      }, 200);
    };

    // -- Is this product currently in the cart? --
    $scope.isInCart = function () {
      return $scope.quantity > 0;
    };

    // -- Add to cart (first click: add 1, show stepper) --
    $scope.addToCart = function () {
      if (!$scope.product || $scope.product.stock <= 0) return;

      $scope.quantity = 1;
      CartService.addItem($scope.product, 1);
      refreshIcons();

      $scope.addedFeedback = true;
      $timeout(function () {
        $scope.addedFeedback = false;
      }, 1500);
    };

    // -- Stepper callback: qty changed via directive --
    $scope.onStepperChange = function (qty) {
      $scope.quantity = qty;
      CartService.updateQty($scope.product.id, qty);
    };

    // -- Stepper callback: remove from cart (decremented past min) --
    $scope.onStepperRemove = function () {
      $scope.quantity = 0;
      CartService.removeItem($scope.product.id);
      refreshIcons();
    };

    // -- Check if product is in stock --
    $scope.isInStock = function () {
      return $scope.product && $scope.product.stock > 0;
    };

    // -- Navigate back to shop --
    $scope.goToShop = function () {
      $location.path("/shop");
    };

    // -- Content sections config (controls rendering order) --
    $scope.getSections = function () {
      if (!$scope.product) return [];

      var sections = [];

      if ($scope.product.description) {
        sections.push({
          key: "description",
          title: "الوصف",
          icon: "file-text",
          type: "text",
          content: $scope.product.description,
        });
      }

      if ($scope.product.use_cases && $scope.product.use_cases.length > 0) {
        sections.push({
          key: "use_cases",
          title: "دواعى الاستخدام",
          icon: "stethoscope",
          type: "list",
          items: $scope.product.use_cases,
        });
      }

      if ($scope.product.usage && $scope.product.usage.length > 0) {
        sections.push({
          key: "usage",
          title: "طريقة الاستعمال",
          icon: "book-open",
          type: "list",
          items: $scope.product.usage,
        });
      }

      if (
        $scope.product.side_effects &&
        $scope.product.side_effects.length > 0
      ) {
        sections.push({
          key: "side_effects",
          title: "الاعراض الجانبية",
          icon: "alert-triangle",
          type: "list",
          items: $scope.product.side_effects,
        });
      }

      if ($scope.product.warning && $scope.product.warning.length > 0) {
        sections.push({
          key: "warning",
          title: "التحذيرات والاحتياطات",
          icon: "shield-alert",
          type: "list",
          items: $scope.product.warning,
        });
      }

      return sections;
    };
  },
]);
