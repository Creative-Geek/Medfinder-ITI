// Product detail controller
angular.module("medfinderApp").controller("ProductController", [
  "$scope",
  "$routeParams",
  "$location",
  "$timeout",
  "ProductService",
  "CartService",
  "WishlistService",
  function (
    $scope,
    $routeParams,
    $location,
    $timeout,
    ProductService,
    CartService,
    WishlistService,
  ) {
    // -- State --
    $scope.loading = true;
    $scope.error = false;
    $scope.product = null;
    $scope.selectedImage = null;
    $scope.imageChanging = false; // for crossfade animation
    $scope.quantity = 0; // 0 means "not in cart yet"
    $scope.addedFeedback = false;
    $scope.wishlisted = false;
    $scope.reviews = [];
    $scope.avgRating = 0;
    $scope.reviewsLoading = true;

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

        // Load wishlist state for this product
        WishlistService.load().then(function () {
          $scope.wishlisted = WishlistService.isWishlisted(product.id);
        });

        // Load reviews for this product
        ProductService.getReviews(product.id)
          .then(function (res) {
            $scope.reviews = res.data || [];
            if ($scope.reviews.length > 0) {
              var sum = $scope.reviews.reduce(function (s, r) {
                return s + r.rating;
              }, 0);
              $scope.avgRating = (sum / $scope.reviews.length).toFixed(1);
            }
            $scope.reviewsLoading = false;
            refreshIcons();
          })
          .catch(function () {
            $scope.reviewsLoading = false;
          });
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

    // -- Toggle wishlist on product detail page --
    $scope.toggleWishlist = function () {
      if (!$scope.product) return;
      $scope.wishlisted = !$scope.wishlisted;
      WishlistService.toggle($scope.product.id);
    };

    // -- Navigate back to shop --
    $scope.goToShop = function () {
      $location.path("/shop");
    };

    // -- Generate star array for rating display --
    $scope.getStars = function (rating) {
      var stars = [];
      var full = Math.floor(rating);
      var half = rating % 1 >= 0.5 ? 1 : 0;
      var empty = 5 - full - half;
      for (var i = 0; i < full; i++) stars.push("full");
      if (half) stars.push("half");
      for (var j = 0; j < empty; j++) stars.push("empty");
      return stars;
    };

    // -- Get reviewer initial for avatar --
    $scope.getInitial = function (name) {
      return name ? name.charAt(0).toUpperCase() : "?";
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
