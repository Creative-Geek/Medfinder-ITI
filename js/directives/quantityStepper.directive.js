// Quantity stepper directive -- +/- controls for cart and product detail
angular.module("medfinderApp").directive("quantityStepper", function () {
  return {
    restrict: "E",
    scope: {
      qty: "=",
      min: "=?",
      max: "=?",
      onChange: "&?",
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
        }
      };
    },
  };
});
