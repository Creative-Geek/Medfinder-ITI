// Admin products CRUD controller
angular.module("medfinderApp").controller("AdminProductsController", [
  "$scope",
  "ProductService",
  "AdminService",
  function ($scope, ProductService, AdminService) {
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

    // Modal state
    $scope.showModal = false;
    $scope.editingProduct = null;
    $scope.form = {};
    $scope.saving = false;

    // Image upload
    $scope.isDragging = false;
    $scope.imagePreview = null;
    $scope.uploadStatus = null;
    $scope.uploadMessage = "";

    // Delete
    $scope.showDeleteModal = false;
    $scope.deleteTarget = null;
    $scope.deleting = false;

    // Status labels
    var statusLabels = {
      pending: "قيد الانتظار",
      processing: "قيد التجهيز",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };

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
    // Modal: Add / Edit
    // ════════════════════════════════════════
    $scope.openModal = function (product) {
      $scope.uploadStatus = null;
      $scope.uploadMessage = "";

      if (product) {
        // Edit mode
        $scope.editingProduct = product;
        $scope.form = {
          name_ar: product.name_ar,
          name_en: product.name_en,
          price: product.price,
          stock: product.stock,
          type: product.type,
          brand: product.brand || "",
          manufacturer: product.manufacturer || "",
          volume: product.volume || "",
          image_url: product.image_url || "",
          description: product.description || "",
          long_description: product.long_description || "",
          // Array fields -> comma-separated strings
          _category: (product.category || []).join("، "),
          _active_ingredient: (product.active_ingredient || []).join("، "),
          _use_cases: (product.use_cases || []).join("، "),
          _side_effects: (product.side_effects || []).join("، "),
          _usage: (product.usage || []).join("، "),
          _warning: (product.warning || []).join("، "),
        };
        $scope.imagePreview = product.image_url || null;
      } else {
        // Add mode
        $scope.editingProduct = null;
        $scope.form = {
          name_ar: "",
          name_en: "",
          price: null,
          stock: 100,
          type: "",
          brand: "",
          manufacturer: "",
          volume: "",
          image_url: "",
          description: "",
          long_description: "",
          _category: "",
          _active_ingredient: "",
          _use_cases: "",
          _side_effects: "",
          _usage: "",
          _warning: "",
        };
        $scope.imagePreview = null;
      }

      $scope.showModal = true;

      // Re-init lucide icons for modal content
      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 100);
    };

    $scope.closeModal = function ($event) {
      // Close only if backdrop clicked (not inner modal)
      if ($event && $event.target !== $event.currentTarget) return;
      $scope.showModal = false;
    };

    // ════════════════════════════════════════
    // Save Product
    // ════════════════════════════════════════
    function parseArray(str) {
      if (!str) return [];
      // Split by Arabic or English comma
      return str
        .split(/[,،]/)
        .map(function (s) {
          return s.trim();
        })
        .filter(function (s) {
          return s.length > 0;
        });
    }

    $scope.saveProduct = function () {
      if ($scope.saving) return;
      if (!$scope.form.name_ar || !$scope.form.name_en || !$scope.form.type) {
        return;
      }

      $scope.saving = true;

      var data = {
        name_ar: $scope.form.name_ar,
        name_en: $scope.form.name_en,
        price: Number($scope.form.price) || 0,
        stock: Number($scope.form.stock) || 0,
        type: $scope.form.type,
        brand: $scope.form.brand || null,
        manufacturer: $scope.form.manufacturer || null,
        volume: $scope.form.volume || null,
        image_url: $scope.form.image_url || null,
        description: $scope.form.description || null,
        long_description: $scope.form.long_description || null,
        category: parseArray($scope.form._category),
        active_ingredient: parseArray($scope.form._active_ingredient),
        use_cases: parseArray($scope.form._use_cases),
        side_effects: parseArray($scope.form._side_effects),
        usage: parseArray($scope.form._usage),
        warning: parseArray($scope.form._warning),
      };

      var promise;
      if ($scope.editingProduct) {
        promise = ProductService.update($scope.editingProduct.id, data);
      } else {
        promise = ProductService.create(data);
      }

      promise
        .then(function () {
          $scope.showModal = false;
          loadProducts();
        })
        .catch(function (err) {
          console.error("Save failed:", err);
          alert("فشل حفظ المنتج: " + (err.data?.message || err.statusText));
        })
        .finally(function () {
          $scope.saving = false;
        });
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
    // Image Upload (drag-drop + file select)
    // ════════════════════════════════════════
    $scope.triggerFileInput = function () {
      document.getElementById("admin-image-file").click();
    };

    $scope.handleFileSelect = function (input) {
      var file = input.files && input.files[0];
      if (file) {
        uploadImage(file);
      }
      input.value = "";
    };

    $scope.handleFileDrop = function (file) {
      if (file) {
        uploadImage(file);
      }
    };

    function uploadImage(file) {
      if (!file || !file.type.startsWith("image/")) {
        $scope.uploadStatus = "error";
        $scope.uploadMessage = "الرجاء اختيار ملف صورة";
        $scope.$applyAsync();
        return;
      }

      $scope.uploadStatus = null;
      $scope.uploadMessage = "جاري رفع الصورة...";
      $scope.$applyAsync();

      AdminService.uploadImage(file)
        .then(function (publicUrl) {
          $scope.form.image_url = publicUrl;
          $scope.imagePreview = publicUrl;
          $scope.uploadStatus = "success";
          $scope.uploadMessage = "تم رفع الصورة بنجاح";
        })
        .catch(function (err) {
          console.error("Upload failed:", err);
          $scope.uploadStatus = "error";
          $scope.uploadMessage =
            "فشل رفع الصورة: " + (err.data?.message || err.statusText || "خطأ");
        });
    }

    $scope.clearImage = function ($event) {
      if ($event) $event.stopPropagation();
      $scope.form.image_url = "";
      $scope.imagePreview = null;
      $scope.uploadStatus = null;
    };

    // ════════════════════════════════════════
    // Init
    // ════════════════════════════════════════
    loadProducts();
  },
]);

// -- Drag & Drop Directive --
angular.module("medfinderApp").directive("adminDropZone", function () {
  return {
    restrict: "A",
    scope: false,
    link: function (scope, element, attrs) {
      var el = element[0];

      el.addEventListener("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        scope.$apply(function () {
          scope.isDragging = true;
        });
      });

      el.addEventListener("dragleave", function (e) {
        e.preventDefault();
        e.stopPropagation();
        scope.$apply(function () {
          scope.isDragging = false;
        });
      });

      el.addEventListener("drop", function (e) {
        e.preventDefault();
        e.stopPropagation();
        scope.$apply(function () {
          scope.isDragging = false;
        });

        var file =
          e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
          scope.$apply(function () {
            scope.handleFileDrop(file);
          });
        }
      });
    },
  };
});
