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
        scope.isDragOver = false;
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

        var widgetRoot = element[0].querySelector(".chat-widget-container");
        var fabEl = element[0].querySelector(".chat-widget-fab");
        var chatWin = element[0].querySelector(".chat-window");

        function syncOpenState() {
          if (widgetRoot) {
            widgetRoot.classList.toggle("chat-widget--open", !!scope.isOpen);
          }

          if (fabEl) {
            fabEl.setAttribute("aria-hidden", scope.isOpen ? "true" : "false");
          }

          if (chatWin) {
            chatWin.setAttribute(
              "aria-hidden",
              scope.isOpen ? "false" : "true",
            );
          }
        }

        // Initialize icons on first load if open or closed
        function refreshWidgetIcons() {
          if (typeof lucide === "undefined") return;

          lucide.createIcons({ root: element[0] });
        }

        $timeout(function () {
          syncOpenState();
          if (scope.isOpen) scrollToBottom();
          refreshWidgetIcons();
        });

        scope.$watch("isOpen", function () {
          syncOpenState();
        });

        function setChatOpen(nextOpen) {
          scope.isOpen = nextOpen;
          scope.saveState();
          syncOpenState();

          if (scope.isOpen) {
            scrollToBottom();
          }
        }

        scope.toggleChat = function () {
          if (scope.isOpen) {
            setChatOpen(false);
            return;
          }

          // Only allow logged in users to open the chat
          if (!$rootScope.currentUser) {
            // Alternatively, could redirect to login
            alert("يرجى تسجيل الدخول أولاً لاستخدام هذه الخاصية.");
            return;
          }

          setChatOpen(true);
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

        function resetFileInput() {
          var fileInput = element[0].querySelector('input[type="file"]');
          if (fileInput) fileInput.value = "";
        }

        function hasImageData(dataTransfer) {
          if (!dataTransfer) return false;

          var files = dataTransfer.files;
          if (files && files.length) {
            for (var i = 0; i < files.length; i++) {
              if (files[i].type && files[i].type.indexOf("image/") === 0) {
                return true;
              }
            }
          }

          var items = dataTransfer.items;
          if (items && items.length) {
            for (var j = 0; j < items.length; j++) {
              if (
                items[j].kind === "file" &&
                items[j].type &&
                items[j].type.indexOf("image/") === 0
              ) {
                return true;
              }
            }
          }

          return false;
        }

        function hasFileData(dataTransfer) {
          if (!dataTransfer) return false;

          if (dataTransfer.files && dataTransfer.files.length) return true;

          var items = dataTransfer.items;
          if (items && items.length) {
            for (var i = 0; i < items.length; i++) {
              if (items[i].kind === "file") return true;
            }
          }

          return false;
        }

        function getImageFile(dataTransfer) {
          if (!dataTransfer) return null;

          var files = dataTransfer.files;
          if (files && files.length) {
            for (var i = 0; i < files.length; i++) {
              if (files[i].type && files[i].type.indexOf("image/") === 0) {
                return files[i];
              }
            }
          }

          var items = dataTransfer.items;
          if (items && items.length) {
            for (var j = 0; j < items.length; j++) {
              if (
                items[j].kind === "file" &&
                items[j].type &&
                items[j].type.indexOf("image/") === 0
              ) {
                return items[j].getAsFile();
              }
            }
          }

          return null;
        }

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
                refreshWidgetIcons();
              });
            })
            .catch(function (err) {
              scope.errorMessage = err;
              scope.isLoading = false;
            });

          resetFileInput();
        };

        var dragDepth = 0;

        if (chatWin) {
          var handlePaste = function (e) {
            var items = (
              e.clipboardData ||
              (e.originalEvent && e.originalEvent.clipboardData) ||
              {}
            ).items;
            if (!items) return;
            for (var i = 0; i < items.length; i++) {
              if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault();
                var file = items[i].getAsFile();
                if (file) {
                  scope.$applyAsync(function () {
                    scope.onFileSelect([file]);
                  });
                }
                break;
              }
            }
          };

          var handleDragEnter = function (e) {
            if (!hasFileData(e.dataTransfer)) return;
            e.preventDefault();

            if (scope.isLoading || !hasImageData(e.dataTransfer)) return;

            dragDepth += 1;
            scope.$applyAsync(function () {
              scope.isDragOver = true;
              scope.errorMessage = null;
            });
          };

          var handleDragOver = function (e) {
            if (!hasFileData(e.dataTransfer)) return;
            e.preventDefault();

            if (scope.isLoading || !hasImageData(e.dataTransfer)) return;

            if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
            if (!scope.isDragOver) {
              scope.$applyAsync(function () {
                scope.isDragOver = true;
                scope.errorMessage = null;
              });
            }
          };

          var handleDragLeave = function () {
            if (!scope.isDragOver) return;
            dragDepth = Math.max(dragDepth - 1, 0);
            if (dragDepth === 0) {
              scope.$applyAsync(function () {
                scope.isDragOver = false;
              });
            }
          };

          var handleDrop = function (e) {
            var imageFile = getImageFile(e.dataTransfer);
            var hasDroppedFiles = !!(
              e.dataTransfer &&
              e.dataTransfer.files &&
              e.dataTransfer.files.length
            );

            if (!imageFile && !hasDroppedFiles) return;

            e.preventDefault();
            dragDepth = 0;
            scope.$applyAsync(function () {
              scope.isDragOver = false;

              if (scope.isLoading) return;

              if (imageFile) {
                scope.onFileSelect([imageFile]);
                return;
              }

              scope.errorMessage = "يرجى سحب صورة فقط.";
            });
          };

          chatWin.addEventListener("paste", handlePaste);
          chatWin.addEventListener("dragenter", handleDragEnter);
          chatWin.addEventListener("dragover", handleDragOver);
          chatWin.addEventListener("dragleave", handleDragLeave);
          chatWin.addEventListener("drop", handleDrop);

          scope.$on("$destroy", function () {
            chatWin.removeEventListener("paste", handlePaste);
            chatWin.removeEventListener("dragenter", handleDragEnter);
            chatWin.removeEventListener("dragover", handleDragOver);
            chatWin.removeEventListener("dragleave", handleDragLeave);
            chatWin.removeEventListener("drop", handleDrop);
          });
        }

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
            refreshWidgetIcons();
          }, 50);
        }
      },
    };
  },
]);
