// Admin dashboard controller -- KPI stats + recent orders + revenue chart
angular.module("medfinderApp").controller("AdminDashboardController", [
  "$scope",
  "$timeout",
  "AdminService",
  function ($scope, $timeout, AdminService) {
    $scope.pageTitle = "لوحة التحكم";
    $scope.loading = true;
    $scope.stats = {};
    $scope.recentOrders = [];
    $scope.lowStockProducts = [];
    $scope.lowStockLoadFailed = false;
    $scope.weeklyTotal = 0;
    $scope.today = new Date();

    // Personalised greeting based on time of day
    var hour = new Date().getHours();
    $scope.greeting =
      hour < 12 ? "صباح الخير"
      : hour < 18 ? "مساء الخير"
      : "مساء النور";

    // Read admin name from localStorage sb_user JSON
    try {
      var userStr = localStorage.getItem("sb_user");
      var user = userStr ? JSON.parse(userStr) : null;
      $scope.adminName = (user && (user.full_name || user.email)) || "المدير";
    } catch (e) {
      $scope.adminName = "المدير";
    }

    // Status labels (Arabic)
    $scope.statusLabels = {
      pending: "قيد الانتظار",
      processing: "قيد التجهيز",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };

    // ─── Count-up animation helper ──────────────────────────────────────────
    function animateCountUp(el, endValue, suffix, duration) {
      if (!el) return;
      var start = 0;
      var step = endValue / (duration / 16);
      var current = start;
      var timer = setInterval(function () {
        current = Math.min(current + step, endValue);
        el.textContent =
          Math.round(current).toLocaleString("ar-EG") + (suffix || "");
        if (current >= endValue) clearInterval(timer);
      }, 16);
    }

    // ─── Draw mini revenue bar chart (vanilla canvas) ──────────────────────
    function drawRevenueChart(labels, values) {
      $timeout(function () {
        var canvas = document.getElementById("revenueChart");
        if (!canvas) return;
        var ctx = canvas.getContext("2d");
        var W = canvas.parentElement.offsetWidth || 400;
        var H = 160;
        canvas.width = W;
        canvas.height = H;

        var maxVal = Math.max.apply(null, values) || 1;
        var barCount = labels.length;
        var padLeft = 12;
        var padRight = 12;
        var padTop = 20;
        var padBottom = 30;
        var chartWidth = W - padLeft - padRight;
        var chartHeight = H - padTop - padBottom;
        var slotWidth = chartWidth / barCount;
        var barWidth = Math.max(16, Math.floor(slotWidth - 14));

        ctx.clearRect(0, 0, W, H);

        // Gridlines + baseline
        ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
        ctx.lineWidth = 1;
        [0, 0.33, 0.66, 1].forEach(function (t) {
          var y = padTop + (1 - t) * chartHeight;
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(W - padRight, y);
          ctx.stroke();
        });

        ctx.strokeStyle = "rgba(15, 23, 42, 0.12)";
        ctx.beginPath();
        ctx.moveTo(padLeft, H - padBottom);
        ctx.lineTo(W - padRight, H - padBottom);
        ctx.stroke();

        // Bars
        var barFill = "#8ec2f6";
        var barAccent = "#0583f2";
        var labelColor = "rgba(15, 23, 42, 0.84)";
        var metaColor = "rgba(15, 23, 42, 0.55)";

        values.forEach(function (val, i) {
          var barH = val > 0 ? Math.max(8, (val / maxVal) * chartHeight) : 0;
          var x = padLeft + i * slotWidth + (slotWidth - barWidth) / 2;
          var y = H - padBottom - barH;
          var valueLabel = Math.round(val).toLocaleString("ar-EG");

          ctx.fillStyle = val > 0 ? barFill : "rgba(15, 23, 42, 0.08)";
          ctx.fillRect(
            x,
            val > 0 ? y : H - padBottom - 2,
            barWidth,
            val > 0 ? barH : 2,
          );

          if (val > 0) {
            ctx.fillStyle = barAccent;
            ctx.fillRect(x, y, barWidth, Math.min(3, barH));
          }

          // Value label above bar
          if (val > 0) {
            ctx.fillStyle = labelColor;
            ctx.font = "bold 10px Cairo, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(valueLabel, x + barWidth / 2, y - 6);
          }

          // Day label below bar
          ctx.fillStyle = metaColor;
          ctx.font = "11px Cairo, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(labels[i], x + barWidth / 2, H - 9);
        });
      }, 120);
    }

    // ─── Load Stats ─────────────────────────────────────────────────────────
    AdminService.getStats()
      .then(function (stats) {
        $scope.stats = stats;
      })
      .catch(function () {
        $scope.stats = {
          totalSales: 0,
          customerCount: 0,
          lowStockCount: 0,
          todayOrderCount: 0,
          productCount: 0,
        };
      });

    // ─── Load Recent Orders ─────────────────────────────────────────────────
    AdminService.getRecentOrders(8)
      .then(function (res) {
        $scope.recentOrders = res.data || [];
      })
      .catch(function () {
        $scope.recentOrders = [];
      });

    // ─── Load Low Stock Products ─────────────────────────────────────────────
    AdminService.getLowStockProducts()
      .then(function (res) {
        $scope.lowStockLoadFailed = false;
        $scope.lowStockProducts = res.data || [];
      })
      .catch(function (err) {
        console.error("Failed to load low stock products:", err);
        $scope.lowStockLoadFailed = true;
        $scope.lowStockProducts = [];
      });

    // ─── Load Weekly Revenue ────────────────────────────────────────────────
    AdminService.getWeeklyRevenue()
      .then(function (data) {
        $scope.weeklyTotal = data.total;
        drawRevenueChart(data.labels, data.values);
      })
      .catch(function () {
        drawRevenueChart(
          ["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"],
          [0, 0, 0, 0, 0, 0, 0],
        );
      })
      .finally(function () {
        $scope.loading = false;
        setTimeout(function () {
          medfinderRefreshViewIcons();
        }, 150);
      });
  },
]);
