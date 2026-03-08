// Admin product create/edit controller
angular.module("medfinderApp").controller("AdminProductFormController", [
  "$scope",
  "$routeParams",
  "$location",
  "ProductService",
  "AdminService",
  "SHOP_CATEGORY_TREE",
  function (
    $scope,
    $routeParams,
    $location,
    ProductService,
    AdminService,
    SHOP_CATEGORY_TREE,
  ) {
    var productId = $routeParams.id || null;
    var allowedCategoryLookup = buildAllowedCategoryLookup(SHOP_CATEGORY_TREE);

    $scope.isEditMode = !!productId;
    $scope.loadingProduct = !!productId;
    $scope.saving = false;
    $scope.isDragging = false;
    $scope.imagePreview = null;
    $scope.uploadStatus = null;
    $scope.uploadMessage = "";
    $scope.editingProduct = null;
    $scope.categoryGroups = buildCategoryGroups(SHOP_CATEGORY_TREE);
    $scope.unavailableCategoryValues = [];
    $scope.form = createEmptyForm();

    $scope.pageTitle = $scope.isEditMode ? "تعديل المنتج" : "اضافة منتج جديد";
    $scope.pageSubtitle =
      $scope.isEditMode ?
        "راجع القيم بعناية قبل الحفظ لان بعض الحقول تتحول الى قوائم في قاعدة البيانات"
      : "ادخل بيانات المنتج بصيغة واضحة وثابتة لتجنب مشاكل البنية في قاعدة البيانات";

    function createEmptyForm() {
      return {
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
        _category: [],
        _active_ingredient: "",
        _use_cases: "",
        _side_effects: "",
        _usage: "",
        _warning: "",
      };
    }

    function buildAllowedCategoryLookup(tree) {
      var lookup = {};

      (tree || []).forEach(function (node) {
        (node.categories || []).forEach(function (category) {
          if (category && category.name) {
            lookup[category.name] = true;
          }
        });
      });

      return lookup;
    }

    function buildCategoryGroups(tree) {
      return (tree || []).map(function (node) {
        return {
          type: node.type,
          label: node.label,
          categories: (node.categories || []).map(function (category) {
            return category.name;
          }),
        };
      });
    }

    function normalizeCategories(categories) {
      var values =
        Array.isArray(categories) ? categories : parseArray(categories);
      var uniqueValues = [];
      var seen = {};

      values.forEach(function (value) {
        var trimmedValue = (value || "").trim();

        if (
          !trimmedValue ||
          !allowedCategoryLookup[trimmedValue] ||
          seen[trimmedValue]
        ) {
          return;
        }

        seen[trimmedValue] = true;
        uniqueValues.push(trimmedValue);
      });

      return uniqueValues;
    }

    function findUnavailableCategories(categories) {
      var values =
        Array.isArray(categories) ? categories : parseArray(categories);
      var unavailable = [];
      var seen = {};

      values.forEach(function (value) {
        var trimmedValue = (value || "").trim();

        if (
          !trimmedValue ||
          allowedCategoryLookup[trimmedValue] ||
          seen[trimmedValue]
        ) {
          return;
        }

        seen[trimmedValue] = true;
        unavailable.push(trimmedValue);
      });

      return unavailable;
    }

    function mapProductToForm(product) {
      return {
        name_ar: product.name_ar || "",
        name_en: product.name_en || "",
        price: product.price,
        stock: product.stock,
        type: product.type || "",
        brand: product.brand || "",
        manufacturer: product.manufacturer || "",
        volume: product.volume || "",
        image_url: product.image_url || "",
        description: product.description || "",
        long_description: product.long_description || "",
        _category: normalizeCategories(product.category || []),
        _active_ingredient: (product.active_ingredient || []).join("، "),
        _use_cases: (product.use_cases || []).join("، "),
        _side_effects: (product.side_effects || []).join("، "),
        _usage: (product.usage || []).join("، "),
        _warning: (product.warning || []).join("، "),
      };
    }

    function parseArray(str) {
      if (!str) return [];
      return str
        .split(/[,،]/)
        .map(function (s) {
          return s.trim();
        })
        .filter(function (s) {
          return s.length > 0;
        });
    }

    function initIcons(delay) {
      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, delay || 50);
    }

    function syncPreviewFromUrl() {
      $scope.imagePreview =
        $scope.form.image_url ? $scope.form.image_url.trim() : null;
    }

    function buildPayload() {
      return {
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
        category: normalizeCategories($scope.form._category),
        active_ingredient: parseArray($scope.form._active_ingredient),
        use_cases: parseArray($scope.form._use_cases),
        side_effects: parseArray($scope.form._side_effects),
        usage: parseArray($scope.form._usage),
        warning: parseArray($scope.form._warning),
      };
    }

    function loadProduct() {
      ProductService.getById(productId)
        .then(function (res) {
          $scope.editingProduct = res.data;
          $scope.form = mapProductToForm(res.data);
          $scope.unavailableCategoryValues = findUnavailableCategories(
            res.data.category || [],
          );
          syncPreviewFromUrl();
        })
        .catch(function (err) {
          console.error("Failed to load product:", err);
          alert("تعذر تحميل بيانات المنتج");
          $location.path("/admin/products");
        })
        .finally(function () {
          $scope.loadingProduct = false;
          initIcons(100);
        });
    }

    $scope.goBack = function () {
      $location.path("/admin/products");
    };

    $scope.syncImagePreviewFromUrl = function () {
      $scope.uploadStatus = null;
      $scope.uploadMessage = "";
      syncPreviewFromUrl();
    };

    $scope.triggerFileInput = function () {
      var input = document.getElementById("admin-product-image-file");
      if (input) input.click();
    };

    $scope.handleFileSelect = function (input) {
      var file = input.files && input.files[0];
      if (file) uploadImage(file);
      input.value = "";
    };

    $scope.handleFileDrop = function (file) {
      if (file) uploadImage(file);
    };

    function uploadImage(file) {
      if (!file || !file.type.startsWith("image/")) {
        $scope.uploadStatus = "error";
        $scope.uploadMessage = "الرجاء اختيار ملف صورة صالح";
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
      $scope.uploadMessage = "";
    };

    $scope.isCategorySelected = function (categoryName) {
      return $scope.form._category.indexOf(categoryName) !== -1;
    };

    $scope.toggleCategorySelection = function (categoryName) {
      var nextCategories = ($scope.form._category || []).slice();
      var index = nextCategories.indexOf(categoryName);

      if (!allowedCategoryLookup[categoryName]) return;

      if (index === -1) {
        nextCategories.push(categoryName);
      } else {
        nextCategories.splice(index, 1);
      }

      $scope.form._category = nextCategories;
    };

    $scope.saveProduct = function () {
      var promise;

      if ($scope.saving) return;
      if (!$scope.form.name_ar || !$scope.form.name_en || !$scope.form.type) {
        alert("الرجاء ادخال الاسم العربي والاسم الانجليزي والنوع");
        return;
      }

      $scope.saving = true;
      promise =
        $scope.isEditMode ?
          ProductService.update(productId, buildPayload())
        : ProductService.create(buildPayload());

      promise
        .then(function () {
          $location.path("/admin/products");
        })
        .catch(function (err) {
          console.error("Save failed:", err);
          alert("فشل حفظ المنتج: " + (err.data?.message || err.statusText));
        })
        .finally(function () {
          $scope.saving = false;
        });
    };

    if ($scope.isEditMode) {
      loadProduct();
    } else {
      initIcons(100);
    }
  },
]);

// -- Drag & Drop Directive --
angular.module("medfinderApp").directive("adminDropZone", function () {
  return {
    restrict: "A",
    scope: false,
    link: function (scope, element) {
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
