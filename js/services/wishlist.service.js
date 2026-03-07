// Wishlist service -- server-side wishlist via Supabase REST API
// Table: wishlists (id, user_id, product_id, created_at)
angular.module("medfinderApp").factory("WishlistService", [
  "$http",
  "$q",
  "$rootScope",
  "SUPABASE",
  "AuthService",
  function ($http, $q, $rootScope, SUPABASE, AuthService) {
    var REST = SUPABASE.REST_URL;

    // Local cache: map of product_id -> true
    var _cache = null;
    var _loading = null; // holds the in-flight promise

    function getUserId() {
      var user = AuthService.getCurrentUser();
      return user ? user.id : null;
    }

    // Load all wishlisted product IDs for the current user
    function load() {
      var userId = getUserId();
      if (!userId) {
        _cache = {};
        return $q.resolve(_cache);
      }
      // Return cached data if available
      if (_cache !== null) return $q.resolve(_cache);
      // Return in-flight request if already loading
      if (_loading) return _loading;

      _loading = $http
        .get(REST + "/wishlists?user_id=eq." + userId + "&select=product_id")
        .then(function (res) {
          _cache = {};
          (res.data || []).forEach(function (row) {
            _cache[row.product_id] = true;
          });
          _loading = null;
          syncCount();
          return _cache;
        })
        .catch(function () {
          _cache = {};
          _loading = null;
          syncCount();
          return _cache;
        });

      return _loading;
    }

    // Check if a product is in the wishlist (sync, from cache)
    function isWishlisted(productId) {
      if (!_cache) return false;
      return !!_cache[productId];
    }

    // Add product to wishlist
    function add(productId) {
      var userId = getUserId();
      if (!userId) return $q.reject("Not logged in");

      // Optimistic update
      if (!_cache) _cache = {};
      _cache[productId] = true;
      syncCount();

      return $http
        .post(REST + "/wishlists", {
          user_id: userId,
          product_id: productId,
        })
        .catch(function (err) {
          // Revert on failure (unless it's a duplicate 409)
          if (err.status !== 409) {
            delete _cache[productId];
            syncCount();
          }
          return $q.reject(err);
        });
    }

    // Remove product from wishlist
    function remove(productId) {
      var userId = getUserId();
      if (!userId) return $q.reject("Not logged in");

      // Optimistic update
      if (_cache) delete _cache[productId];
      syncCount();

      return $http
        .delete(
          REST +
            "/wishlists?user_id=eq." +
            userId +
            "&product_id=eq." +
            productId,
        )
        .catch(function (err) {
          // Revert on failure
          if (!_cache) _cache = {};
          _cache[productId] = true;
          syncCount();
          return $q.reject(err);
        });
    }

    // Toggle wishlist state
    function toggle(productId) {
      if (isWishlisted(productId)) {
        return remove(productId);
      } else {
        return add(productId);
      }
    }

    // Get count of wishlisted items
    function getCount() {
      if (!_cache) return 0;
      return Object.keys(_cache).length;
    }

    // Broadcast count to rootScope
    function syncCount() {
      $rootScope.wishlistCount = getCount();
    }

    // Clear cache (e.g. on logout)
    function clearCache() {
      _cache = null;
      _loading = null;
      $rootScope.wishlistCount = 0;
    }

    return {
      load: load,
      isWishlisted: isWishlisted,
      add: add,
      remove: remove,
      toggle: toggle,
      getCount: getCount,
      clearCache: clearCache,
    };
  },
]);
