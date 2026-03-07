// Product card directive -- reused on Home, Shop, and search results
angular.module("medfinderApp").directive("productCard", [
  "CartService",
  "WishlistService",
  function (CartService, WishlistService) {
    return {
      restrict: "E",
      scope: {
        product: "=",
        onAddToCart: "&",
      },
      templateUrl: "views/directives/product-card.html",
      link: function (scope) {
        // -- Cart state --
        scope.cartQty = 0;

        function syncCartState() {
          if (!scope.product) return;
          var items = CartService.getItems();
          var existing = items.find(function (item) {
            return item.id === scope.product.id;
          });
          scope.cartQty = existing ? existing.qty : 0;
        }

        // Init cart state
        syncCartState();

        // -- Wishlist state --
        scope.wishlisted = false;

        function syncWishlistState() {
          if (!scope.product) return;
          WishlistService.load().then(function () {
            scope.wishlisted = WishlistService.isWishlisted(scope.product.id);
          });
        }

        syncWishlistState();

        scope.isWishlisted = function () {
          return scope.wishlisted;
        };

        scope.handleToggleWishlist = function () {
          if (!scope.product) return;
          scope.wishlisted = !scope.wishlisted;
          WishlistService.toggle(scope.product.id);
        };

        scope.isOutOfStock = function () {
          return scope.product && scope.product.stock <= 0;
        };

        scope.isInCart = function () {
          return scope.cartQty > 0;
        };

        scope.getSubtitle = function () {
          if (!scope.product) return "";
          var parts = [];
          if (scope.product.brand) parts.push(scope.product.brand);
          if (scope.product.volume) parts.push(scope.product.volume);
          else if (scope.product.amount) parts.push(scope.product.amount);
          return parts.join(" | ");
        };

        scope.fallbackImage = function () {
          scope.product.image_url =
            "https://placehold.co/200x200/f5f5f5/999999?text=No+Image";
        };

        // -- Add to cart (first click) --
        scope.handleAddToCart = function () {
          if (scope.isOutOfStock()) return;
          scope.onAddToCart({ product: scope.product });
          scope.cartQty = 1;
        };

        // -- Stepper callbacks --
        scope.onStepperChange = function (qty) {
          CartService.updateQty(scope.product.id, qty);
          scope.cartQty = qty;
        };

        scope.onStepperRemove = function () {
          CartService.removeItem(scope.product.id);
          scope.cartQty = 0;
        };
      },
    };
  },
]);
