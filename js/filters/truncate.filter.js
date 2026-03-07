// Truncate filter -- shortens text to a max length with ellipsis
angular.module("medfinderApp").filter("truncate", function () {
  return function (text, length) {
    if (!text) return "";
    length = length || 80;
    if (text.length <= length) return text;
    return text.substring(0, length).trimEnd() + "...";
  };
});
