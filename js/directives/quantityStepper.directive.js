// Quantity stepper directive -- unified +/- controls
// Used in: product card, product detail, cart
// Usage: <quantity-stepper qty="item.qty" max="item.stock" size="lg" on-change="update(qty)" on-remove="remove()"></quantity-stepper>
angular.module("medfinderApp").directive("quantityStepper", function () {
  return {
    restrict: "E",
    scope: {
      qty: "=",
      min: "=?",
      max: "=?",
      size: "@?",
      onChange: "&?",
      onRemove: "&?",
    },
    templateUrl: "views/directives/quantity-stepper.html",
    link: function (scope) {
      scope.min = scope.min || 1;
      scope.max = scope.max || 99;

      scope.increment = function () {
        if (scope.qty < scope.max) {
          scope.qty++;
          if (scope.onChange) scope.onChange({ qty: scope.qty });
        }
      };

      scope.decrement = function () {
        if (scope.qty > scope.min) {
          scope.qty--;
          if (scope.onChange) scope.onChange({ qty: scope.qty });
        } else if (scope.qty <= scope.min && scope.onRemove) {
          // At min: trigger remove callback (e.g. remove from cart)
          scope.onRemove();
        }
      };

      scope.getSizeClass = function () {
        return scope.size === "lg" ? "qty-stepper--lg" : "";
      };
    },
  };
});
