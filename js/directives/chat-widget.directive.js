angular.module("medfinderApp").directive("chatWidget", [
  "ChatbotService",
  "$rootScope",
  "$timeout",
  function (ChatbotService, $rootScope, $timeout) {
    return {
      restrict: "E",
      templateUrl: "views/directives/chat-widget.html",
      scope: {},
      link: function (scope, element) {
        scope.isOpen = false;
        scope.isLoading = false;
        scope.inputText = "";
        scope.selectedImage = null; // raw base64 after resize
        scope.messages = [];
        scope.sessionId = null;
        scope.errorMessage = null;

        scope.saveState = function () {
          sessionStorage.setItem(
            "mf_chat_state",
            JSON.stringify({
              sessionId: scope.sessionId,
              messages: scope.messages,
              isOpen: scope.isOpen,
            }),
          );
        };

        // Try to load state from session storage for persistence
        var savedChat = sessionStorage.getItem("mf_chat_state");
        if (savedChat) {
          try {
            var state = JSON.parse(savedChat);
            scope.messages = state.messages || [];
            scope.sessionId = state.sessionId;
            scope.isOpen = !!state.isOpen;
          } catch (e) {
            console.error("Failed to parse saved chat state");
          }
        }

        // Initialize icons on first load if open or closed
        $timeout(function () {
          if (scope.isOpen) scrollToBottom();
          if (typeof lucide !== "undefined") lucide.createIcons();
        });

        scope.toggleChat = function () {
          // Only allow logged in users
          if (!$rootScope.currentUser) {
            // Alternatively, could redirect to login
            alert("يرجى تسجيل الدخول أولاً لاستخدام هذه الخاصية.");
            return;
          }
          scope.isOpen = !scope.isOpen;
          scope.saveState();

          if (scope.isOpen) {
            scrollToBottom();
          }
          // initialize lucide icons for chat header OR the floating bubble icon
          $timeout(function () {
            if (typeof lucide !== "undefined") lucide.createIcons();
          });
        };

        // Allow other parts of the app to programmatically open the chat
        $rootScope.$on("chatbot:open", function () {
          if (!scope.isOpen) {
            scope.toggleChat();
          }
        });

        scope.clearSession = function () {
          scope.messages = [];
          scope.sessionId = null;
          scope.errorMessage = null;
          scope.saveState();
        };

        scope.onFileSelect = function (files) {
          if (!files || files.length === 0) return;
          scope.errorMessage = null;
          scope.isLoading = true;

          ChatbotService.resizeImage(files[0])
            .then(function (base64) {
              scope.selectedImage = base64;
              scope.isLoading = false;
              // Re-init icons so the X button on the preview renders
              $timeout(function () {
                if (typeof lucide !== "undefined") lucide.createIcons();
              });
            })
            .catch(function (err) {
              scope.errorMessage = err;
              scope.isLoading = false;
            });

          // Reset file input
          element[0].querySelector('input[type="file"]').value = "";
        };

        scope.removeImage = function () {
          scope.selectedImage = null;
        };

        scope.onKeydown = function (e) {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            scope.sendMessage();
          }
        };

        scope.sendMessage = function () {
          if (
            (!scope.inputText.trim() && !scope.selectedImage) ||
            scope.isLoading
          ) {
            return;
          }

          if (scope.messages.length >= 20) {
            scope.errorMessage =
              "الحد الأقصى للمحادثة وصل لك. ابدأ محادثة جديدة.";
            return;
          }

          scope.errorMessage = null;

          var userMsg = {
            role: "user",
            content: scope.inputText.trim(),
            image: scope.selectedImage,
          };

          // Store for sending (we don't send the base64 string repeatedly in history to save token/payload size)
          var historyToSend = scope.messages.map(function (m) {
            return { role: m.role, content: m.content || "[Image attached]" };
          });

          var textToSend = scope.inputText;
          var imgToSend = scope.selectedImage;

          // Append to UI immediately
          scope.messages.push(userMsg);
          scope.inputText = "";
          scope.selectedImage = null;
          scope.isLoading = true;
          scope.saveState();
          scrollToBottom();

          ChatbotService.sendMessage(
            textToSend,
            scope.sessionId,
            historyToSend,
            imgToSend,
          )
            .then(function (res) {
              scope.sessionId = res.session_id;
              scope.messages.push({
                role: "assistant",
                content: res.reply,
                products: res.products,
              });
              scope.saveState();
            })
            .catch(function (errorMsg) {
              scope.messages.push({
                role: "assistant",
                content: errorMsg,
                isError: true,
              });
              // Do not save error messages to session storage so they don't persist
            })
            .finally(function () {
              scope.isLoading = false;
              scrollToBottom();
            });
        };

        function scrollToBottom() {
          $timeout(function () {
            var msgArea = element[0].querySelector("#chat-messages-area");
            if (msgArea) {
              msgArea.scrollTop = msgArea.scrollHeight;
            }
            if (typeof lucide !== "undefined") lucide.createIcons();
          }, 50);
        }
      },
    };
  },
]);
