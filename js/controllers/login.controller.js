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
    $scope.fieldErrors = {};

    try {
      var authNotice = sessionStorage.getItem("sb_auth_notice");
      if (authNotice) {
        $scope.error = authNotice;
        sessionStorage.removeItem("sb_auth_notice");
      }
    } catch (e) {}

    // Admin email for role detection
    var ADMIN_EMAIL = "ahmedtaha1234@gmail.com";

    // -- Toggle between login and signup --
    $scope.toggleMode = function () {
      $scope.isSignup = !$scope.isSignup;
      $scope.error = "";
      $scope.fieldErrors = {};
      $scope.form = {
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
      };
      // Re-render Lucide icons for the toggled fields
      $timeout(function () {
        medfinderRefreshViewIcons();
      }, 50);
    };

    // -- Per-field validation --
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateField(field) {
      var f = $scope.form;
      var errors = $scope.fieldErrors;

      if (field === "email") {
        if (!f.email || !f.email.trim()) {
          errors.email = "يرجى إدخال البريد الالكتروني";
        } else if (!emailPattern.test(f.email.trim())) {
          errors.email =
            "يرجى إدخال بريد الكتروني صحيح (مثال: name@example.com)";
        } else {
          delete errors.email;
        }
      }

      if (field === "password") {
        if (!f.password || f.password.length < 6) {
          errors.password = "كلمة المرور يجب ان تكون 6 احرف على الاقل";
        } else {
          delete errors.password;
        }
        // Re-validate confirm if it was touched
        if ($scope.isSignup && f.confirmPassword) {
          validateField("confirmPassword");
        }
      }

      if (field === "fullName" && $scope.isSignup) {
        if (!f.fullName || !f.fullName.trim()) {
          errors.fullName = "يرجى إدخال الاسم بالكامل";
        } else {
          delete errors.fullName;
        }
      }

      if (field === "confirmPassword" && $scope.isSignup) {
        if (
          f.password &&
          f.confirmPassword &&
          f.password !== f.confirmPassword
        ) {
          errors.confirmPassword = "كلمة المرور غير متطابقة";
        } else {
          delete errors.confirmPassword;
        }
      }
    }

    // -- Blur handler (called from template) --
    $scope.onFieldBlur = function (field) {
      validateField(field);
    };

    // -- Full validation (on submit) --
    function validateAll() {
      $scope.fieldErrors = {};
      validateField("email");
      validateField("password");
      if ($scope.isSignup) {
        validateField("fullName");
        validateField("confirmPassword");
      }
      return Object.keys($scope.fieldErrors).length === 0;
    }

    // -- Set admin role in session --
    function setUserRole(email, profile) {
      var role =
        (profile && profile.is_admin) || email === ADMIN_EMAIL ?
          "admin"
        : "user";
      localStorage.setItem("sb_user_role", role);
    }

    function finalizeAuthenticatedSession(email) {
      return AuthService.ensureAccountActive({
        allowOnError: false,
        redirectOnSuspended: false,
      })
        .then(function (profile) {
          setUserRole(email, profile);
          return profile;
        })
        .catch(function (err) {
          AuthService.logout();
          throw err;
        });
    }

    function getAuthErrorMessage(err, fallback) {
      if (err && err.code === "SUSPENDED") {
        return "تم إيقاف هذا الحساب مؤقتًا. يرجى التواصل مع الإدارة.";
      }

      if (err && err.config && err.config.url) {
        if (err.config.url.indexOf("/profiles") !== -1) {
          return "تعذر التحقق من حالة الحساب. يرجى المحاولة مرة أخرى.";
        }
      }

      return fallback;
    }

    // -- Submit handler --
    $scope.submit = function () {
      if (!validateAll()) return;

      $scope.loading = true;
      $scope.error = "";

      var email = $scope.form.email.trim();
      var password = $scope.form.password;

      if ($scope.isSignup) {
        // -- Signup flow --
        AuthService.signup(email, password, $scope.form.fullName.trim())
          .then(function () {
            return AuthService.login(email, password);
          })
          .then(function () {
            return finalizeAuthenticatedSession(email);
          })
          .then(function () {
            $location.path("/");
          })
          .catch(function (err) {
            var msg = getAuthErrorMessage(err, "حدث خطأ اثناء إنشاء الحساب");
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
          .then(function () {
            return finalizeAuthenticatedSession(email);
          })
          .then(function () {
            $location.path("/");
          })
          .catch(function (err) {
            var msg = getAuthErrorMessage(
              err,
              "البريد الالكتروني او كلمة المرور غير صحيحة",
            );
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
      medfinderRefreshViewIcons();
    }, 100);
  },
]);
