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
        var padLeft = 8;
        var padRight = 8;
        var padTop = 16;
        var padBottom = 36;
        var barWidth = Math.floor((W - padLeft - padRight) / barCount) - 6;

        ctx.clearRect(0, 0, W, H);

        // Gridlines
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 1;
        [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
          var y = padTop + (1 - t) * (H - padTop - padBottom);
          ctx.beginPath();
          ctx.moveTo(padLeft, y);
          ctx.lineTo(W - padRight, y);
          ctx.stroke();
        });

        // Bars
        var primary = "#0583f2";
        var accent = "#f99d1c";
        values.forEach(function (val, i) {
          var barH = Math.max(4, (val / maxVal) * (H - padTop - padBottom));
          var x = padLeft + i * ((W - padLeft - padRight) / barCount) + 3;
          var y = H - padBottom - barH;
          var isMax = val === Math.max.apply(null, values);

          // Gradient fill
          var grad = ctx.createLinearGradient(x, y, x, H - padBottom);
          grad.addColorStop(0, isMax ? accent : primary);
          grad.addColorStop(
            1,
            isMax ? "rgba(249,157,28,0.25)" : "rgba(5,131,242,0.25)",
          );

          ctx.fillStyle = grad;
          ctx.beginPath();
          var r = 4;
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + barWidth - r, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
          ctx.lineTo(x + barWidth, H - padBottom);
          ctx.lineTo(x, H - padBottom);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fill();

          // Value label above bar
          if (val > 0) {
            ctx.fillStyle = isMax ? accent : primary;
            ctx.font = "bold 10px Cairo, sans-serif";
            ctx.textAlign = "center";
            var label =
              val >= 1000 ?
                Math.round(val / 1000) + "k"
              : String(Math.round(val));
            ctx.fillText(label, x + barWidth / 2, y - 4);
          }

          // Day label below bar
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.font = "11px Cairo, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(labels[i], x + barWidth / 2, H - 8);
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
        $scope.lowStockProducts = res.data || [];
      })
      .catch(function () {
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
          if (typeof lucide !== "undefined") lucide.createIcons();
        }, 150);
      });
  },
]);
