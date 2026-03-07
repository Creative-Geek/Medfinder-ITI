// Cart service -- manages cart state in sessionStorage
angular.module("medfinderApp").factory("CartService", [
  "$rootScope",
  function ($rootScope) {
    var STORAGE_KEY = "mf_cart";

    function getCart() {
      var cartStr = sessionStorage.getItem(STORAGE_KEY);
      return cartStr ? JSON.parse(cartStr) : [];
    }

    function saveCart(cart) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      $rootScope.cartCount = cart.reduce(function (sum, item) {
        return sum + item.qty;
      }, 0);
    }

    // Init cart count on load
    $rootScope.cartCount = getCart().reduce(function (sum, item) {
      return sum + item.qty;
    }, 0);

    return {
      getItems: function () {
        return getCart();
      },

      addItem: function (product, qty) {
        qty = qty || 1;
        var cart = getCart();
        var existing = cart.find(function (item) {
          return item.id === product.id;
        });

        if (existing) {
          existing.qty += qty;
        } else {
          cart.push({
            id: product.id,
            name_ar: product.name_ar,
            price: parseFloat(product.price),
            image_url: product.image_url,
            brand: product.brand,
            qty: qty,
            stock: product.stock,
          });
        }

        saveCart(cart);
        return cart;
      },

      updateQty: function (productId, qty) {
        var cart = getCart();
        var item = cart.find(function (i) {
          return i.id === productId;
        });
        if (item) {
          item.qty = Math.max(1, qty);
          saveCart(cart);
        }
        return cart;
      },

      removeItem: function (productId) {
        var cart = getCart().filter(function (item) {
          return item.id !== productId;
        });
        saveCart(cart);
        return cart;
      },

      clearCart: function () {
        saveCart([]);
      },

      getTotal: function () {
        return getCart().reduce(function (sum, item) {
          return sum + item.price * item.qty;
        }, 0);
      },

      getCount: function () {
        return getCart().reduce(function (sum, item) {
          return sum + item.qty;
        }, 0);
      },
    };
  },
]);
