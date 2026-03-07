// Wishlist page controller -- displays user's saved products
angular.module("medfinderApp").controller("WishlistController", [
  "$scope",
  "$timeout",
  "$http",
  "SUPABASE",
  "WishlistService",
  "CartService",
  function ($scope, $timeout, $http, SUPABASE, WishlistService, CartService) {
    var REST = SUPABASE.REST_URL;

    $scope.loading = true;
    $scope.products = [];

    function refreshIcons() {
      $timeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 50);
    }

    // Load wishlisted products with full details
    function loadWishlist() {
      $scope.loading = true;

      WishlistService.load().then(function (cache) {
        var productIds = Object.keys(cache);

        if (productIds.length === 0) {
          $scope.products = [];
          $scope.loading = false;
          refreshIcons();
          return;
        }

        // Fetch full product details for all wishlisted IDs

        $http
          .get(
            REST +
              "/products?id=in.(" +
              productIds.join(",") +
              ")&select=id,name_ar,name_en,price,brand,manufacturer,volume,amount,image_url,stock,category,type",
          )
          .then(function (res) {
            $scope.products = res.data || [];
            $scope.loading = false;
            refreshIcons();
          })
          .catch(function () {
            $scope.products = [];
            $scope.loading = false;
            refreshIcons();
          });
      });
    }

    loadWishlist();

    // -- Remove from wishlist and update UI --
    $scope.removeFromWishlist = function (product) {
      WishlistService.remove(product.id);
      $scope.products = $scope.products.filter(function (p) {
        return p.id !== product.id;
      });
    };

    // -- Add to cart --
    $scope.addToCart = function (product) {
      CartService.addItem(product, 1);
    };

    // -- Wishlist toggle (for product-card directive) --
    $scope.toggleWishlist = function (product) {
      WishlistService.toggle(product.id);
    };
  },
]);
