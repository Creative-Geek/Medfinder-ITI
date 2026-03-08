// Route configuration via ngRoute
// Access control: guest (anyone), user (logged in), admin (admin role)
angular.module("medfinderApp").config([
  "$routeProvider",
  "$locationProvider",
  function ($routeProvider, $locationProvider) {
    var protectedAccountResolve = {
      activeAccount: [
        "AuthService",
        function (AuthService) {
          return AuthService.ensureAccountActive();
        },
      ],
    };

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
      .when("/404", {
        templateUrl: "views/404.html",
        access: "guest",
      })

      // -- User routes --
      .when("/cart", {
        templateUrl: "views/cart.html",
        controller: "CartController",
        access: "user",
        resolve: protectedAccountResolve,
      })
      .when("/wishlist", {
        templateUrl: "views/wishlist.html",
        controller: "WishlistController",
        access: "user",
        resolve: protectedAccountResolve,
      })
      .when("/orders", {
        templateUrl: "views/orders.html",
        controller: "OrdersController",
        access: "user",
        resolve: protectedAccountResolve,
      })

      // -- Admin routes --
      .when("/admin", {
        templateUrl: "views/admin/dashboard.html",
        controller: "AdminDashboardController",
        access: "admin",
        resolve: protectedAccountResolve,
      })
      .when("/admin/products", {
        templateUrl: "views/admin/products.html",
        controller: "AdminProductsController",
        access: "admin",
        resolve: protectedAccountResolve,
      })
      .when("/admin/products/new", {
        templateUrl: "views/admin/product-form.html",
        controller: "AdminProductFormController",
        access: "admin",
        resolve: protectedAccountResolve,
      })
      .when("/admin/products/:id/edit", {
        templateUrl: "views/admin/product-form.html",
        controller: "AdminProductFormController",
        access: "admin",
        resolve: protectedAccountResolve,
      })
      .when("/admin/orders", {
        templateUrl: "views/admin/orders.html",
        controller: "AdminOrdersController",
        access: "admin",
        resolve: protectedAccountResolve,
      })
      .when("/admin/customers", {
        templateUrl: "views/admin/customers.html",
        controller: "AdminCustomersController",
        access: "admin",
        resolve: protectedAccountResolve,
      })

      .otherwise({ redirectTo: "/404" });
  },
]);
