angular.module("medfinderApp").factory("ChatbotService", [
  "$http",
  "$q",
  "SUPABASE",
  function ($http, $q, SUPABASE) {
    var CHATBOT_URL = SUPABASE.REST_URL.replace(
      "/rest/v1",
      "/functions/v1/chatbot",
    );

    // Helper: Resize image to max 1000x1000 pixels
    function resizeImageForGemini(file) {
      return $q(function (resolve, reject) {
        if (!file || !file.type.match(/^image\//)) {
          return reject("Invalid file type. Must be an image.");
        }
        var reader = new FileReader();
        reader.onload = function (e) {
          var img = new Image();
          img.onload = function () {
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            var MAX_WIDTH = 1000;
            var MAX_HEIGHT = 1000;
            var width = img.width;
            var height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Return jpeg as base64 string
            var dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            resolve(dataUrl);
          };
          img.onerror = function () {
            reject("Failed to load image for resizing.");
          };
          img.src = e.target.result;
        };
        reader.onerror = function () {
          reject("File reading failed.");
        };
        reader.readAsDataURL(file);
      });
    }

    return {
      sendMessage: function (message, session_id, history, imageBase64) {
        return $http
          .post(CHATBOT_URL, {
            message: message,
            session_id: session_id,
            history: history,
            image: imageBase64, // already resized in directive before calling this
          })
          .then(function (res) {
            return res.data;
          })
          .catch(function (error) {
            console.error("Chatbot API Error:", error);
            if (error.status === 429) {
              return $q.reject(
                error.data.message ||
                  "لقد تجاوزت الحد المسموح للرسائل. يرجى الانتظار قليلا.",
              );
            } else if (error.status === 413) {
              return $q.reject(
                "معلش، الصورة كبيرة جدا. حاول تصغرها أو تختار صورة أقل حجما.",
              );
            } else if (
              error.status === 400 &&
              error.data &&
              error.data.message
            ) {
              return $q.reject(error.data.message);
            }
            return $q.reject("عذرا، حدث خطأ أثناء الاتصال بالخادم.");
          });
      },
      resizeImage: resizeImageForGemini,
    };
  },
]);
