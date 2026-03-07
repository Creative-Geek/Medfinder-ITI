// Route configuration via ngRoute
// Access control: guest (anyone), user (logged in), admin (admin role)
angular.module("medfinderApp").config([
  "$routeProvider",
  "$locationProvider",
  function ($routeProvider, $locationProvider) {
    $routeProvider
      // -- Guest routes --
      .when("/login", {
        templateUrl: "views/login.html",
        controller: "LoginController",
        access: "guest",
      })
      .when("/", {
        templateUrl: "views/home.html",
        controller: "HomeController",
        access: "guest",
      })
      .when("/shop", {
        templateUrl: "views/shop.html",
        controller: "ShopController",
        access: "guest",
        reloadOnSearch: false,
      })
      .when("/product/:id", {
        templateUrl: "views/product.html",
        controller: "ProductController",
        access: "guest",
      })
      .when("/about", {
        templateUrl: "views/about.html",
        controller: "AboutController",
        access: "guest",
      })

      // -- User routes --
      .when("/cart", {
        templateUrl: "views/cart.html",
        controller: "CartController",
        access: "user",
      })
      .when("/orders", {
        templateUrl: "views/orders.html",
        controller: "OrdersController",
        access: "user",
      })

      // -- Admin routes --
      .when("/admin", {
        templateUrl: "views/admin/dashboard.html",
        controller: "AdminDashboardController",
        access: "admin",
      })
      .when("/admin/products", {
        templateUrl: "views/admin/products.html",
        controller: "AdminProductsController",
        access: "admin",
      })
      .when("/admin/orders", {
        templateUrl: "views/admin/orders.html",
        controller: "AdminOrdersController",
        access: "admin",
      })
      .when("/admin/customers", {
        templateUrl: "views/admin/customers.html",
        controller: "AdminCustomersController",
        access: "admin",
      })

      .otherwise({ redirectTo: "/" });
  },
]);
