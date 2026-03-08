// Admin service -- dashboard stats, orders, and customers via Supabase REST
angular.module("medfinderApp").factory("AdminService", [
  "$http",
  "$q",
  "SUPABASE",
  function ($http, $q, SUPABASE) {
    var rest = SUPABASE.REST_URL;
    var storageUrl = SUPABASE.STORAGE_URL;

    return {
      // Dashboard aggregation: fetch stats in parallel
      getStats: function () {
        return $q
          .all({
            // Total sales (non-cancelled orders)
            sales: $http.get(
              rest + "/orders?select=total&status=neq.cancelled",
            ),
            // Customer count
            customers: $http.get(rest + "/profiles?select=id", {
              headers: { Prefer: "count=exact" },
            }),
            // Low stock products (stock < 10)
            lowStock: $http.get(rest + "/products?select=id&stock=lt.10", {
              headers: { Prefer: "count=exact" },
            }),
            // Orders today
            todayOrders: $http.get(
              rest +
                "/orders?select=id&created_at=gte." +
                new Date().toISOString().split("T")[0],
              { headers: { Prefer: "count=exact" } },
            ),
          })
          .then(function (results) {
            // Sum up total sales
            var totalSales = 0;
            if (results.sales.data && results.sales.data.length) {
              totalSales = results.sales.data.reduce(function (sum, o) {
                return sum + Number(o.total || 0);
              }, 0);
            }

            // Extract counts from Content-Range header or array length
            function extractCount(response) {
              var range = response.headers("Content-Range");
              if (range) {
                var parts = range.split("/");
                var count = parts[1];
                if (count && count !== "*") return parseInt(count, 10);
              }
              return response.data ? response.data.length : 0;
            }

            return {
              totalSales: totalSales,
              customerCount: extractCount(results.customers),
              lowStockCount: extractCount(results.lowStock),
              todayOrderCount: extractCount(results.todayOrders),
            };
          });
      },

      // Recent orders with customer info
      getRecentOrders: function (limit) {
        return $http.get(
          rest +
            "/orders?select=*,profiles(full_name,email)&order=created_at.desc&limit=" +
            (limit || 10),
        );
      },

      // All orders with customer and items
      getAllOrders: function () {
        return $http.get(
          rest +
            "/orders?select=*,profiles(full_name,email,phone),order_items(*,products(name_ar,image_url,price))&order=created_at.desc",
        );
      },

      // All customers with order count
      getAllCustomers: function () {
        return $http.get(
          rest + "/profiles?select=*,orders(id)&order=created_at.desc",
        );
      },

      // Customer's orders
      getCustomerOrders: function (userId) {
        return $http.get(
          rest +
            "/orders?user_id=eq." +
            userId +
            "&select=*,order_items(quantity)&order=created_at.desc",
        );
      },

      // Upload product image to Supabase storage
      uploadImage: function (file) {
        var ext = file.name.split(".").pop();
        var filename =
          Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
        var bucket = "product-images";

        var token = localStorage.getItem("sb_access_token");

        return $http({
          method: "POST",
          url: storageUrl + "/object/" + bucket + "/" + filename,
          data: file,
          headers: {
            "Content-Type": file.type,
            "x-upsert": "false",
          },
          transformRequest: angular.identity,
        }).then(function () {
          return storageUrl + "/object/public/" + bucket + "/" + filename;
        });
      },
    };
  },
]);
