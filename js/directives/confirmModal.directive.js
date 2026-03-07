// Confirm modal directive -- reusable confirmation dialog
angular.module("medfinderApp").directive("confirmModal", function () {
  return {
    restrict: "E",
    scope: {
      show: "=",
      title: "@",
      message: "@",
      onConfirm: "&",
      onCancel: "&",
    },
    templateUrl: "views/directives/confirm-modal.html",
    link: function (scope) {
      scope.confirm = function () {
        if (scope.onConfirm) scope.onConfirm();
        scope.show = false;
      };

      scope.cancel = function () {
        if (scope.onCancel) scope.onCancel();
        scope.show = false;
      };
    },
  };
});
