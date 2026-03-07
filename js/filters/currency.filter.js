// Currency filter -- formats price as "150.00 EGP"
angular.module("medfinderApp").filter("egp", function () {
  return function (amount) {
    if (amount === null || amount === undefined) return "";
    var num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toFixed(2) + " EGP";
  };
});
