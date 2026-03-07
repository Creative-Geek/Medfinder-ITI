// Login/Signup controller
angular.module("medfinderApp").controller("LoginController", [
  "$scope",
  "$location",
  "$timeout",
  "AuthService",
  function ($scope, $location, $timeout, AuthService) {
    // -- Redirect if already logged in --
    if (AuthService.isLoggedIn()) {
      $location.path("/");
      return;
    }

    // -- State --
    $scope.isSignup = false;
    $scope.form = {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    };
    $scope.showPassword = false;
    $scope.showConfirmPassword = false;
    $scope.loading = false;
    $scope.error = "";

    // Admin email for role detection
    var ADMIN_EMAIL = "ahmedtaha1234@gmail.com";

    // -- Toggle between login and signup --
    $scope.toggleMode = function () {
      $scope.isSignup = !$scope.isSignup;
      $scope.error = "";
      $scope.form = {
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      };
      // Re-render Lucide icons for the toggled fields
      $timeout(function () {
        lucide.createIcons();
      }, 50);
    };

    // -- Validation --
    function validate() {
      var f = $scope.form;

      if (!f.email || !f.email.trim()) {
        return "يرجى إدخال البريد الالكتروني";
      }

      // Basic email pattern
      var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(f.email.trim())) {
        return "يرجى إدخال بريد الكتروني صحيح";
      }

      if (!f.password || f.password.length < 6) {
        return "كلمة المرور يجب ان تكون 6 احرف على الاقل";
      }

      if ($scope.isSignup) {
        if (!f.fullName || !f.fullName.trim()) {
          return "يرجى إدخال الاسم بالكامل";
        }
        if (f.password !== f.confirmPassword) {
          return "كلمة المرور غير متطابقة";
        }
      }

      return null;
    }

    // -- Set admin role in session --
    function setUserRole(email) {
      var role = email === ADMIN_EMAIL ? "admin" : "user";
      localStorage.setItem("sb_user_role", role);
    }

    // -- Submit handler --
    $scope.submit = function () {
      // Validate
      var err = validate();
      if (err) {
        $scope.error = err;
        return;
      }

      $scope.loading = true;
      $scope.error = "";

      var email = $scope.form.email.trim();
      var password = $scope.form.password;

      if ($scope.isSignup) {
        // -- Signup flow --
        // Note: profile row is auto-created by DB trigger (handle_new_user)
        AuthService.signup(email, password, $scope.form.fullName.trim())
          .then(function () {
            // Auto-login after signup
            return AuthService.login(email, password);
          })
          .then(function (res) {
            // Set role
            setUserRole(email);
            // Redirect to home
            $location.path("/");
          })
          .catch(function (err) {
            var msg = "حدث خطأ اثناء إنشاء الحساب";
            if (err.data) {
              if (
                err.data.msg &&
                err.data.msg.indexOf("already registered") !== -1
              ) {
                msg = "هذا البريد الالكتروني مسجل بالفعل";
              } else if (err.data.error_description) {
                msg = err.data.error_description;
              } else if (err.data.msg) {
                msg = err.data.msg;
              }
            }
            $scope.error = msg;
          })
          .finally(function () {
            $scope.loading = false;
          });
      } else {
        // -- Login flow --
        AuthService.login(email, password)
          .then(function (res) {
            // Set role
            setUserRole(email);
            // Redirect to home
            $location.path("/");
          })
          .catch(function (err) {
            var msg = "البريد الالكتروني او كلمة المرور غير صحيحة";
            if (err.data && err.data.error_description) {
              if (err.data.error_description.indexOf("Invalid login") !== -1) {
                msg = "البريد الالكتروني او كلمة المرور غير صحيحة";
              } else {
                msg = err.data.error_description;
              }
            }
            $scope.error = msg;
          })
          .finally(function () {
            $scope.loading = false;
          });
      }
    };

    // -- Init Lucide icons --
    $timeout(function () {
      lucide.createIcons();
    }, 100);
  },
]);
