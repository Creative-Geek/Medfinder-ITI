// Admin products CRUD controller
angular.module("medfinderApp").controller("AdminProductsController", [
  "$scope",
  "ProductService",
  function ($scope, ProductService) {
    $scope.pageTitle = "ادارة المنتجات";

    // -- State --
    $scope.allProducts = [];
    $scope.filteredProducts = [];
    $scope.paginatedProducts = [];
    $scope.loading = true;
    $scope.searchQuery = "";
    $scope.activeTab = "all";
    $scope.lowStockCount = 0;
    $scope.outOfStockCount = 0;

    // Pagination
    $scope.pageSize = 10;
    $scope.currentPage = 1;
    $scope.totalPages = 1;
    $scope.pageNumbers = [];

    // Delete
    $scope.showDeleteModal = false;
    $scope.deleteTarget = null;
    $scope.deleting = false;

    // ════════════════════════════════════════
    // Load products
    // ════════════════════════════════════════
    function loadProducts() {
      $scope.loading = true;
      ProductService.getAll({ order: "id.desc" })
        .then(function (res) {
          $scope.allProducts = res.data || [];
          updateCounts();
          applyFilters();
        })
        .catch(function (err) {
          console.error("Failed to load products:", err);
          $scope.allProducts = [];
        })
        .finally(function () {
          $scope.loading = false;
          setTimeout(function () {
            if (typeof lucide !== "undefined") lucide.createIcons();
          }, 100);
        });
    }

    function updateCounts() {
      $scope.lowStockCount = $scope.allProducts.filter(function (p) {
        return p.stock > 0 && p.stock < 10;
      }).length;
      $scope.outOfStockCount = $scope.allProducts.filter(function (p) {
        return p.stock <= 0;
      }).length;
    }

    // ════════════════════════════════════════
    // Filter & Search
    // ════════════════════════════════════════
    $scope.setTab = function (tab) {
      $scope.activeTab = tab;
      $scope.currentPage = 1;
      applyFilters();
    };

    $scope.applyFilters = applyFilters;

    function applyFilters() {
      var products = $scope.allProducts;

      // Tab filter
      if ($scope.activeTab === "low") {
        products = products.filter(function (p) {
          return p.stock > 0 && p.stock < 10;
        });
      } else if ($scope.activeTab === "out") {
        products = products.filter(function (p) {
          return p.stock <= 0;
        });
      }

      // Search filter
      var q = ($scope.searchQuery || "").toLowerCase().trim();
      if (q) {
        products = products.filter(function (p) {
          return (
            (p.name_ar && p.name_ar.toLowerCase().indexOf(q) !== -1) ||
            (p.name_en && p.name_en.toLowerCase().indexOf(q) !== -1) ||
            (p.brand && p.brand.toLowerCase().indexOf(q) !== -1) ||
            (p.manufacturer && p.manufacturer.toLowerCase().indexOf(q) !== -1)
          );
        });
      }

      $scope.filteredProducts = products;
      $scope.totalPages = Math.max(
        1,
        Math.ceil(products.length / $scope.pageSize),
      );

      if ($scope.currentPage > $scope.totalPages) {
        $scope.currentPage = $scope.totalPages;
      }

      updatePageNumbers();
      paginate();

      // Re-init icons after Angular re-renders filtered rows
      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 50);
    }

    function paginate() {
      var start = ($scope.currentPage - 1) * $scope.pageSize;
      $scope.paginatedProducts = $scope.filteredProducts.slice(
        start,
        start + $scope.pageSize,
      );
    }

    function updatePageNumbers() {
      var pages = [];
      for (var i = 1; i <= $scope.totalPages; i++) {
        pages.push(i);
      }
      $scope.pageNumbers = pages;
    }

    $scope.goToPage = function (page) {
      if (page < 1 || page > $scope.totalPages) return;
      $scope.currentPage = page;
      paginate();
      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 50);
    };

    // ════════════════════════════════════════
    // Delete Product
    // ════════════════════════════════════════
    $scope.confirmDelete = function (product) {
      $scope.deleteTarget = product;
      $scope.showDeleteModal = true;
      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 50);
    };

    $scope.doDelete = function () {
      if (!$scope.deleteTarget || $scope.deleting) return;
      $scope.deleting = true;

      ProductService.remove($scope.deleteTarget.id)
        .then(function () {
          $scope.showDeleteModal = false;
          $scope.deleteTarget = null;
          loadProducts();
        })
        .catch(function (err) {
          console.error("Delete failed:", err);
          alert("فشل حذف المنتج");
        })
        .finally(function () {
          $scope.deleting = false;
        });
    };

    // ════════════════════════════════════════
    // Init
    // ════════════════════════════════════════
    loadProducts();
  },
]);
