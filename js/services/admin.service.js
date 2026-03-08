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
            // Total products
            products: $http.get(rest + "/products?select=id", {
              headers: { Prefer: "count=exact" },
            }),
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
              productCount: extractCount(results.products),
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

      // Suspend/reactivate a customer account through a guarded RPC
      setCustomerSuspension: function (userId, isSuspended) {
        return $http.post(rest + "/rpc/set_profile_suspension", {
          p_user_id: userId,
          p_is_suspended: !!isSuspended,
        });
      },

      // Low-stock products (stock < 10), sorted ascending
      getLowStockProducts: function () {
        return $http.get(
          rest +
            "/products?select=id,name_ar,manufacturer,image_url,stock&stock=lt.10&order=stock.asc&limit=10",
        );
      },

      // Last 7 days revenue per calendar day
      getWeeklyRevenue: function () {
        var days = [];
        var labels = [];
        var now = new Date();
        for (var i = 6; i >= 0; i--) {
          var d = new Date(now);
          d.setDate(d.getDate() - i);
          var iso = d.toISOString().split("T")[0];
          days.push(iso);
          // Short Arabic weekday abbrs
          var dayNames = ["أحد", "اثن", "ثلا", "أرب", "خمس", "جمع", "سبت"];
          labels.push(dayNames[d.getDay()]);
        }

        var weekStart = days[0];
        return $http
          .get(
            rest +
              "/orders?select=total,created_at&created_at=gte." +
              weekStart +
              "T00:00:00&status=neq.cancelled&order=created_at.asc",
          )
          .then(function (res) {
            var orders = res.data || [];
            var buckets = {};
            days.forEach(function (d) {
              buckets[d] = 0;
            });
            orders.forEach(function (o) {
              var day = o.created_at ? o.created_at.split("T")[0] : null;
              if (day && buckets[day] !== undefined) {
                buckets[day] += Number(o.total || 0);
              }
            });
            var values = days.map(function (d) {
              return buckets[d];
            });
            var total = values.reduce(function (s, v) {
              return s + v;
            }, 0);
            return { labels: labels, values: values, total: total };
          });
      },

      // Upload product image to Supabase storage
      uploadImage: function (file) {
        var ext = file.name.split(".").pop();
        var filename =
          Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext;
        var bucket = "product-images";

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
