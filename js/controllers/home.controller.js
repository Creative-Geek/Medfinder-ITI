// Home Page Controller
angular.module("medfinderApp").controller("HomeController", [
  "$scope",
  "$interval",
  "$http",
  "SUPABASE",
  function ($scope, $interval, $http, SUPABASE) {
    var REST = SUPABASE.REST_URL;

    // ── Carousel ──
    $scope.carousel = {
      current: 0,
      slides: [
        { image: "assets/images/3.webp", alt: "Redoxon Vitamin C" },
        { image: "assets/images/1.webp", alt: "Bepanthen" },
        { image: "assets/images/5.webp", alt: "Doliprane" },
        { image: "assets/images/2.webp", alt: "Bisolvon" },
        { image: "assets/images/4.webp", alt: "Nasacort" },
      ],
      next: function () {
        this.current = (this.current + 1) % this.slides.length;
      },
      prev: function () {
        this.current =
          (this.current - 1 + this.slides.length) % this.slides.length;
      },
      goTo: function (index) {
        this.current = index;
      },
    };

    // Auto-advance carousel every 5 seconds
    var autoPlay = $interval(function () {
      $scope.carousel.next();
    }, 5000);

    $scope.$on("$destroy", function () {
      $interval.cancel(autoPlay);
    });

    // ── Category shortcuts grid ──
    $scope.categoryShortcuts = [
      { label: "مسكنات", category: "مسكنات", icon: "pill" },
      { label: "الكحة", category: "الكحة", icon: "stethoscope" },
      { label: "الحماية من الشمس", category: "الحماية من الشمس", icon: "sun" },
      { label: "غسول الوجه", category: "غسول الوجه", icon: "droplets" },
      {
        label: "الحموضة وسوء الهضم",
        category: "الحموضة وسوء الهضم",
        icon: "flame",
      },
      {
        label: "تقوية المناعة",
        category: "تقوية المناعة",
        icon: "shield-plus",
      },
      {
        label: "البرد و السعال",
        category: "البرد و السعال",
        icon: "thermometer",
      },
      {
        label: "الحفاضات و الكريمات",
        category: "الحفاضات و الكريمات",
        icon: "baby",
      },
      {
        label: "مستلزمات الحلاقة",
        category: "مستلزمات الحلاقة",
        icon: "scissors",
      },
      { label: "معجون الأسنان", category: "معجون الأسنان", icon: "sparkles" },
    ];

    // ── Brands (from actual DB data, ordered by product count) ──
    $scope.brands = [
      { name: "LA ROCHE POSAY", logo: "assets/brands/la-roche-posay.png" },
      { name: "Nivea", logo: "assets/brands/nivea.png" },
      { name: "Garnier", logo: "assets/brands/garnier.png" },
      { name: "Dove", logo: "assets/brands/dove.png" },
      { name: "Eva", logo: "assets/brands/eva.png" },
      { name: "NOW Foods", logo: "assets/brands/now-foods.png" },
      { name: "Pharco", logo: "assets/brands/pharco.png" },
      { name: "L'Oreal Paris", logo: "assets/brands/loreal.png" },
      { name: "Gillette", logo: "assets/brands/gillette.png" },
      { name: "Listerine", logo: "assets/brands/listerine.png" },
    ];

    // ── Product Shelves ──
    var selectFields =
      "id,name_ar,name_en,price,brand,volume,amount,image_url,stock,category";

    $scope.shelves = {
      popular: { items: [], loading: true },
      vitamins: { items: [], loading: true },
      sugar: { items: [], loading: true },
    };

    // Shelf 1: Most Popular -- random selection from all products
    $http
      .get(REST + "/products?select=" + selectFields + "&stock=gt.0&limit=30")
      .then(function (res) {
        // Shuffle and pick 12 for a varied selection
        var shuffled = (res.data || []).sort(function () {
          return Math.random() - 0.5;
        });
        $scope.shelves.popular.items = shuffled.slice(0, 12);
        $scope.shelves.popular.loading = false;
        reinitIcons();
      })
      .catch(function () {
        $scope.shelves.popular.loading = false;
      });

    // Shelf 2: Vitamins & Supplements
    $http
      .get(
        REST +
          "/products?select=" +
          selectFields +
          "&category=cs.{الفيتامينات و المكملات الغذائية}&limit=12",
      )
      .then(function (res) {
        $scope.shelves.vitamins.items = res.data || [];
        $scope.shelves.vitamins.loading = false;
        reinitIcons();
      })
      .catch(function () {
        $scope.shelves.vitamins.loading = false;
      });

    // Shelf 3: Sugar Substitutes
    $http
      .get(
        REST +
          "/products?select=" +
          selectFields +
          "&category=cs.{بديل للسكر}&limit=12",
      )
      .then(function (res) {
        $scope.shelves.sugar.items = res.data || [];
        $scope.shelves.sugar.loading = false;
        reinitIcons();
      })
      .catch(function () {
        $scope.shelves.sugar.loading = false;
      });

    // ── Shelf horizontal scroll via chevrons ──
    $scope.scrollShelf = function ($event, direction) {
      var wrapper = $event.target.closest(".shelf-scroll-wrapper");
      if (!wrapper) return;
      var track = wrapper.querySelector(".shelf-track");
      if (!track) return;
      var scrollAmount = 600; // ~3 card widths
      if (direction === "left") {
        track.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        track.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };

    // ── Cart action ──
    $scope.addToCart = function (product) {
      // Will delegate to CartService once implemented
      console.log("Add to cart:", product.id, product.name_ar);
    };

    // ── Wishlist action ──
    $scope.toggleWishlist = function (product) {
      console.log("Toggle wishlist:", product.id, product.name_ar);
    };

    // ── Reinit Lucide icons after dynamic content loads ──
    function reinitIcons() {
      setTimeout(function () {
        if (typeof lucide !== "undefined") lucide.createIcons();
      }, 100);
    }
  },
]);
