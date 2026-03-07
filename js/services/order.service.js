// Order service -- order placement and history via Supabase REST
angular.module("medfinderApp").factory("OrderService", [
  "$http",
  "SUPABASE",
  function ($http, SUPABASE) {
    var ordersBase = SUPABASE.REST_URL + "/orders";
    var itemsBase = SUPABASE.REST_URL + "/order_items";

    return {
      // Place a new order (order header + line items)
      place: function (order) {
        return $http.post(ordersBase, order, {
          headers: { Prefer: "return=representation" },
        });
      },

      // Add line items to an order
      addItems: function (items) {
        return $http.post(itemsBase, items, {
          headers: { Prefer: "return=representation" },
        });
      },

      // Get orders for the logged-in user
      getMyOrders: function (userId) {
        return $http.get(
          ordersBase + "?user_id=eq." + userId + "&order=created_at.desc",
        );
      },

      // Get a single order with its items (admin or user)
      getById: function (id) {
        return $http.get(
          ordersBase + "?id=eq." + id + "&select=*,order_items(*)",
          { headers: { Accept: "application/vnd.pgrst.object+json" } },
        );
      },

      // Admin: get all orders
      getAll: function (params) {
        return $http.get(ordersBase + "?order=created_at.desc", {
          params: params,
        });
      },

      // Admin: update order status
      updateStatus: function (id, status) {
        return $http.patch(
          ordersBase + "?id=eq." + id,
          { status: status },
          { headers: { Prefer: "return=representation" } },
        );
      },

      // Decrement stock atomically via RPC (called after order items insertion)
      decrementStock: function (productId, quantity) {
        return $http.post(SUPABASE.REST_URL + "/rpc/decrement_stock", {
          p_product_id: productId,
          p_quantity: quantity,
        });
      },
    };
  },
]);
