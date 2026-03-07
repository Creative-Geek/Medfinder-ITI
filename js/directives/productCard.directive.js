// Product card directive -- reused on Home, Shop, and search results
angular.module("medfinderApp").directive("productCard", function () {
  return {
    restrict: "E",
    scope: {
      product: "=",
      onAddToCart: "&",
      onToggleWishlist: "&",
    },
    templateUrl: "views/directives/product-card.html",
    link: function (scope) {
      scope.isOutOfStock = function () {
        return scope.product && scope.product.stock <= 0;
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
    },
  };
});
