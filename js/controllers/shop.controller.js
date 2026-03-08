// Shop controller: product grid, category/brand filters, search, pagination
angular.module("medfinderApp").controller("ShopController", [
  "$scope",
  "$location",
  "$http",
  "SUPABASE",
  "SHOP_CATEGORY_TREE",
  "CartService",
  function (
    $scope,
    $location,
    $http,
    SUPABASE,
    SHOP_CATEGORY_TREE,
    CartService,
  ) {
    var REST = SUPABASE.REST_URL;
    var PAGE_SIZE = 12;

    // ── State ──
    $scope.products = [];
    $scope.loading = true;
    $scope.totalCount = 0;
    $scope.currentPage = 1;
    $scope.totalPages = 1;

    // Filters
    $scope.activeType = null;
    $scope.activeCategory = null;
    $scope.activeBrands = {};
    $scope.inStockOnly = false;
    $scope.searchQuery = "";
    $scope.sortBy = "name_ar.asc";

    // ── Type -> Category tree (shared with admin form) ──
    $scope.categoryTree = angular.copy(SHOP_CATEGORY_TREE).map(function (node) {
      node.open = false;
      return node;
    });

    // Brand list (populated from current results)
    $scope.brandList = [];

    // ── Init from query params ──
    function initFromParams() {
      var params = $location.search();
      if (params.search) {
        $scope.searchQuery = params.search;
      }
      if (params.type) {
        $scope.activeType = params.type;
        // Open the matching tree node
        $scope.categoryTree.forEach(function (node) {
          if (node.type === params.type) node.open = true;
        });
      }
      if (params.category) {
        $scope.activeCategory = params.category;
        // If category is set but type isn't, find & open matching type
        if (!$scope.activeType) {
          $scope.categoryTree.forEach(function (node) {
            node.categories.forEach(function (cat) {
              if (cat.name === params.category) {
                $scope.activeType = node.type;
                node.open = true;
              }
            });
          });
        }
      }
      if (params.brand) {
        $scope.activeBrands[params.brand] = true;
      }
      if (params.inStock === "1") {
        $scope.inStockOnly = true;
      }
      if (params.page) {
        $scope.currentPage = parseInt(params.page, 10) || 1;
      }
    }

    initFromParams();
    updateFilterChips();

    // ── Build page title ──
    $scope.getPageTitle = function () {
      if ($scope.searchQuery)
        return 'نتائج البحث: "' + $scope.searchQuery + '"';
      if ($scope.activeCategory) return $scope.activeCategory;
      if ($scope.activeType) return "كل " + $scope.activeType;
      return "جميع المنتجات";
    };

    // ── Search from within shop page ──
    $scope.clearSearch = function () {
      $scope.searchQuery = "";
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      updateFilterChips();
    };

    // ── Filter actions ──
    $scope.selectType = function (node) {
      if ($scope.activeType === node.type && !$scope.activeCategory) {
        // Deselect
        $scope.activeType = null;
        node.open = false;
      } else {
        // Close all others, open this one
        $scope.categoryTree.forEach(function (n) {
          n.open = false;
        });
        $scope.activeType = node.type;
        $scope.activeCategory = null;
        node.open = true;
      }
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      loadBrands();
      updateFilterChips();
    };

    $scope.selectCategory = function (cat) {
      if ($scope.activeCategory === cat.name) {
        $scope.activeCategory = null;
      } else {
        $scope.activeCategory = cat.name;
      }
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      loadBrands();
      updateFilterChips();
    };

    $scope.selectAllForType = function (node) {
      $scope.activeCategory = null;
      $scope.activeType = node.type;
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      loadBrands();
      updateFilterChips();
    };

    $scope.toggleBrand = function (brand) {
      if ($scope.activeBrands[brand]) {
        delete $scope.activeBrands[brand];
      } else {
        $scope.activeBrands[brand] = true;
      }
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      updateFilterChips();
    };

    $scope.toggleInStockOnly = function () {
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      loadBrands();
      updateFilterChips();
    };

    $scope.changeSort = function () {
      $scope.currentPage = 1;
      loadProducts();
    };

    $scope.clearAllFilters = function () {
      $scope.activeType = null;
      $scope.activeCategory = null;
      $scope.activeBrands = {};
      $scope.inStockOnly = false;
      $scope.searchQuery = "";
      $scope.sortBy = "name_ar.asc";
      $scope.currentPage = 1;
      $scope.categoryTree.forEach(function (n) {
        n.open = false;
      });
      updateUrl();
      loadProducts();
      loadBrands();
      updateFilterChips();
    };

    $scope.hasActiveFilters = function () {
      return (
        $scope.activeType ||
        $scope.activeCategory ||
        $scope.inStockOnly ||
        $scope.searchQuery ||
        Object.keys($scope.activeBrands).length > 0
      );
    };

    // ── Active filter chips (cached to avoid infinite digest) ──
    $scope.activeFilterChips = [];

    function updateFilterChips() {
      var chips = [];
      if ($scope.searchQuery) {
        chips.push({ type: "search", label: $scope.searchQuery });
      }
      if ($scope.activeType) {
        chips.push({ type: "type", label: $scope.activeType });
      }
      if ($scope.activeCategory) {
        chips.push({ type: "category", label: $scope.activeCategory });
      }
      Object.keys($scope.activeBrands).forEach(function (brand) {
        chips.push({ type: "brand", label: brand });
      });
      if ($scope.inStockOnly) {
        chips.push({ type: "stock", label: "المتوفر فقط" });
      }
      $scope.activeFilterChips = chips;
    }

    $scope.removeFilter = function (filter) {
      switch (filter.type) {
        case "search":
          $scope.searchQuery = "";
          break;
        case "type":
          $scope.activeType = null;
          $scope.activeCategory = null;
          $scope.categoryTree.forEach(function (n) {
            n.open = false;
          });
          break;
        case "category":
          $scope.activeCategory = null;
          break;
        case "brand":
          delete $scope.activeBrands[filter.label];
          break;
        case "stock":
          $scope.inStockOnly = false;
          break;
      }
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      loadBrands();
      updateFilterChips();
    };

    // ── Pagination ──
    $scope.goToPage = function (page) {
      if (page < 1 || page > $scope.totalPages) return;
      $scope.currentPage = page;
      updateUrl();
      loadProducts();
      // Scroll to top of product grid
      var grid = document.querySelector(".shop-grid-area");
      if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    $scope.getPages = function () {
      var pages = [];
      var start = Math.max(1, $scope.currentPage - 2);
      var end = Math.min($scope.totalPages, start + 4);
      start = Math.max(1, end - 4);
      for (var i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    };

    // ── Update URL without reloading ──
    function updateUrl() {
      var params = {};
      if ($scope.searchQuery) params.search = $scope.searchQuery;
      if ($scope.activeType) params.type = $scope.activeType;
      if ($scope.activeCategory) params.category = $scope.activeCategory;
      if ($scope.inStockOnly) params.inStock = "1";
      var brandKeys = Object.keys($scope.activeBrands);
      if (brandKeys.length === 1) params.brand = brandKeys[0];
      if ($scope.currentPage > 1) params.page = $scope.currentPage;
      $location.search(params);
    }

    // ── Load products from Supabase REST ──
    function loadProducts() {
      $scope.loading = true;

      var selectFields =
        "id,name_ar,name_en,price,brand,manufacturer,volume,amount,image_url,stock,category,type";

      var url = REST + "/products?select=" + selectFields;

      // Type filter
      if ($scope.activeType) {
        url += "&type=eq." + encodeURIComponent($scope.activeType);
      }

      // Category filter (text[] overlap)
      if ($scope.activeCategory) {
        url +=
          "&category=cs.{" + encodeURIComponent($scope.activeCategory) + "}";
      }

      if ($scope.inStockOnly) {
        url += "&stock=gt.0";
      }

      // Brand filter (multi-select with OR)
      var brandKeys = Object.keys($scope.activeBrands);
      if (brandKeys.length > 0) {
        if (brandKeys.length === 1) {
          url += "&brand=eq." + encodeURIComponent(brandKeys[0]);
        } else {
          url +=
            "&brand=in.(" +
            brandKeys
              .map(function (b) {
                return '"' + b + '"';
              })
              .join(",") +
            ")";
        }
      }

      // Search filter (name_ar, name_en, or brand match)
      if ($scope.searchQuery) {
        var q = encodeURIComponent("%" + $scope.searchQuery + "%");
        url +=
          "&or=(name_ar.ilike." +
          q +
          ",name_en.ilike." +
          q +
          ",brand.ilike." +
          q +
          ")";
      }

      // Sort
      if ($scope.sortBy) {
        url += "&order=" + $scope.sortBy;
      }

      // Pagination headers
      var offset = ($scope.currentPage - 1) * PAGE_SIZE;
      var rangeEnd = offset + PAGE_SIZE - 1;

      $http
        .get(url, {
          headers: {
            Prefer: "count=exact",
            Range: offset + "-" + rangeEnd,
          },
        })
        .then(function (res) {
          $scope.products = res.data || [];

          // Parse total count from Content-Range header
          var contentRange = res.headers("Content-Range");
          if (contentRange) {
            var total = parseInt(contentRange.split("/")[1], 10);
            if (!isNaN(total)) {
              $scope.totalCount = total;
              $scope.totalPages = Math.ceil(total / PAGE_SIZE);
            }
          }

          $scope.loading = false;
          reinitIcons();
        })
        .catch(function () {
          $scope.loading = false;
          $scope.products = [];
        });
    }

    // ── Load brands with counts (based on current type/category filter) ──
    function loadBrands() {
      var url = REST + "/products?select=brand";

      if ($scope.activeType) {
        url += "&type=eq." + encodeURIComponent($scope.activeType);
      }
      if ($scope.activeCategory) {
        url +=
          "&category=cs.{" + encodeURIComponent($scope.activeCategory) + "}";
      }
      if ($scope.inStockOnly) {
        url += "&stock=gt.0";
      }

      url += "&brand=not.is.null";

      $http
        .get(url)
        .then(function (res) {
          var counts = {};
          (res.data || []).forEach(function (row) {
            if (row.brand) {
              counts[row.brand] = (counts[row.brand] || 0) + 1;
            }
          });

          // Sort by count descending
          $scope.brandList = Object.keys(counts)
            .map(function (name) {
              return { name: name, count: counts[name] };
            })
            .sort(function (a, b) {
              return b.count - a.count;
            });
        })
        .catch(function () {
          $scope.brandList = [];
        });
    }

    // ── Cart action ──
    $scope.addToCart = function (product) {
      CartService.addItem(product, 1);
    };

    // ── Wishlist action ──
    $scope.toggleWishlist = function (product) {
      console.log("Toggle wishlist:", product.id, product.name_ar);
    };

    // ── Reinit Lucide icons ──
    function reinitIcons() {
      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 100);
    }

    // ── React to URL query param changes (reloadOnSearch: false) ──
    $scope.$on("$routeUpdate", function () {
      // Reset state and re-read params
      $scope.activeType = null;
      $scope.activeCategory = null;
      $scope.activeBrands = {};
      $scope.inStockOnly = false;
      $scope.searchQuery = "";
      $scope.currentPage = 1;
      $scope.categoryTree.forEach(function (n) {
        n.open = false;
      });
      initFromParams();
      loadProducts();
      loadBrands();
      updateFilterChips();
    });

    // ── Initial load ──
    loadProducts();
    loadBrands();
  },
]);
