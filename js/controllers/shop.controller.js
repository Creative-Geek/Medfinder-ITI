// Shop controller: product grid, category/brand filters, search, pagination
angular.module("medfinderApp").controller("ShopController", [
  "$scope",
  "$location",
  "$http",
  "SUPABASE",
  "CartService",
  function ($scope, $location, $http, SUPABASE, CartService) {
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
    $scope.searchQuery = "";
    $scope.sortBy = "name_ar.asc";

    // ── Type -> Category tree (from actual DB data) ──
    $scope.categoryTree = [
      {
        type: "الأدوية",
        label: "الأدوية",
        open: false,
        categories: [
          { name: "الفيتامينات و المكملات الغذائية", count: 10 },
          { name: "الحموضة وسوء الهضم", count: 8 },
          { name: "الكحة", count: 7 },
          { name: "بديل للسكر", count: 7 },
          { name: "مسكنات", count: 6 },
          { name: "مضادات حيوية", count: 6 },
          { name: "المغص", count: 5 },
          { name: "امساك", count: 5 },
          { name: "البرد و السعال", count: 3 },
          { name: "مضادات حيوية موضعية", count: 3 },
          { name: "الحروق البسيطة", count: 1 },
        ],
      },
      {
        type: "الحماية من الفيروسات",
        label: "الحماية من الفيروسات",
        open: false,
        categories: [{ name: "تقوية المناعة", count: 5 }],
      },
      {
        type: "منتجات المرأة",
        label: "منتجات المرأة",
        open: false,
        categories: [
          { name: "فوط صحية", count: 4 },
          { name: "إزالة الشعر", count: 4 },
          { name: "مزيل العرق للسيدات", count: 4 },
          { name: "صحة المرأة", count: 1 },
        ],
      },
      {
        type: "الأم و الطفل",
        label: "الأم و الطفل",
        open: false,
        categories: [
          { name: "الحفاضات و الكريمات", count: 4 },
          { name: "لبن الاطفال", count: 4 },
          { name: "العناية بالأم", count: 3 },
        ],
      },
      {
        type: "العناية بالبشرة و الشعر",
        label: "العناية بالبشرة و الشعر",
        open: false,
        categories: [
          { name: "الحماية من الشمس", count: 8 },
          { name: "العناية باليد و القدم", count: 6 },
          { name: "غسول الوجه", count: 6 },
          { name: "بلسم الشعر", count: 5 },
          { name: "شامبو", count: 4 },
          { name: "ماسكات الوجه", count: 3 },
          { name: "تفتيح البشرة", count: 3 },
          { name: "مزيل المكياج", count: 3 },
        ],
      },
      {
        type: "العناية بالاسنان",
        label: "العناية بالاسنان",
        open: false,
        categories: [
          { name: "عناية الفم", count: 8 },
          { name: "معجون الأسنان", count: 4 },
          { name: "العناية بالفم", count: 4 },
          { name: "فرشاة الأسنان", count: 4 },
        ],
      },
      {
        type: "منتجات الرجال",
        label: "منتجات الرجال",
        open: false,
        categories: [
          { name: "مزيل العرق للرجال", count: 4 },
          { name: "جل الحلاقة", count: 4 },
          { name: "مستلزمات الحلاقة", count: 3 },
        ],
      },
    ];

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
      if (params.page) {
        $scope.currentPage = parseInt(params.page, 10) || 1;
      }
    }

    initFromParams();

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
    };

    $scope.selectAllForType = function (node) {
      $scope.activeCategory = null;
      $scope.activeType = node.type;
      $scope.currentPage = 1;
      updateUrl();
      loadProducts();
      loadBrands();
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
    };

    $scope.changeSort = function () {
      $scope.currentPage = 1;
      loadProducts();
    };

    $scope.clearAllFilters = function () {
      $scope.activeType = null;
      $scope.activeCategory = null;
      $scope.activeBrands = {};
      $scope.searchQuery = "";
      $scope.sortBy = "name_ar.asc";
      $scope.currentPage = 1;
      $scope.categoryTree.forEach(function (n) {
        n.open = false;
      });
      updateUrl();
      loadProducts();
      loadBrands();
    };

    $scope.hasActiveFilters = function () {
      return (
        $scope.activeType ||
        $scope.activeCategory ||
        $scope.searchQuery ||
        Object.keys($scope.activeBrands).length > 0
      );
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
      $scope.searchQuery = "";
      $scope.currentPage = 1;
      $scope.categoryTree.forEach(function (n) {
        n.open = false;
      });
      initFromParams();
      loadProducts();
      loadBrands();
    });

    // ── Initial load ──
    loadProducts();
    loadBrands();
  },
]);
