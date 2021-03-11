import imageCompression from "browser-image-compression";

class FormManager {
  constructor(form, options) {
    if (!form && !document.querySelector(form)) {
      console.error("Form: no form specified.");
      return false;
    }
    this.form = document.querySelector(form);

    // form options
    if (typeof options == "object") {
      // use image compression on selected image - default to true, cast to bool
      this.imageCompression = !!options.hasOwnProperty("imageCompression")
        ? !!options.imageCompression
        : true;

      // recaptcha url - default to false
      this.recaptchaUrl = options.hasOwnProperty("recaptchaUrl")
        ? options.recaptchaUrl
        : false;

      // disable default form submission - default to false, cast to bool
      this.submit = !!options.hasOwnProperty("submit")
        ? !!options.submit
        : true;

      // error message element - default to false
      this.errorContainer = options.hasOwnProperty("errorContainer")
        ? options.errorContainer
        : false;
      // check error container exists
      if (this.errorContainer) {
        if (document.querySelector(options.errorContainer)) {
          this.errorContainer = document.querySelector(options.errorContainer);
        } else {
          console.warn(
            "errorContainer '" + this.errorContainer + "' does not exist!"
          );
        }
      } else {
        console.warn("No errorContainer specified!");
      }
    }

    // add click handler to submit buttons
    var t = this;
    this.form.querySelectorAll("[type='submit']").forEach((input) => {
      input.addEventListener("click", function (e) {
        e.preventDefault();
        // validate form
        if (t.validate()) {
          // if form allowed to submit (default action), validate and submit
          if (t.submit) {
            t.submitForm();
          } else {
            // fire custom submit event if declared
            if (t.onSubmit) {
              t.onSubmit();
            }
          }
        }
      });
    });

    // if image compression enabled, set handler for file inputs
    if (this.imageCompression) {
      this.form.querySelectorAll("input[type='file']").forEach((input) => {
        input.addEventListener("change", function (e) {
          e.preventDefault();

          // check for image files
          if (e.target.accept.indexOf("image") != -1) {
            // get file
            var imageFile = e.target.files[0];

            // default compression options
            var options = {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 1200,
            };

            // compress image
            imageCompression(imageFile, options)
              .then(function (compressedFile) {
                // convert value to base64
                var reader = new FileReader();
                reader.readAsDataURL(compressedFile);
                reader.onloadend = function () {
                  var base64data = reader.result;
                  // add compressed image property to input
                  e.target.compressedFile = base64data;
                };
              })
              .catch(function (error) {
                console.warn("FormManager: " + error.message);
              });
          }
        });
      });
    }

    // event handlers
    this.onSubmit;
    this.onError;
    this.onComplete;
  }

  /*
  Validate form elements
  */
  validate() {
    var t = this;
    var errors = 0;
    this.form.querySelectorAll("input,select,textarea").forEach((input) => {
      // check that value is set for required elements
      if (
        input.required &&
        ((input.type != "checkbox" && !input.value) ||
          (input.type == "checkbox" && !input.checked))
      ) {
        // only show message for first error encountered
        if (!errors) {
          if (t.errorContainer) {
            t.errorContainer.classList.add("active");
            t.errorContainer.innerHTML = input.getAttribute("data-error-msg");
          }
        }
        errors++;
      }

      // validate email input fields
      if (
        input.required &&
        input.type == "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)
      ) {
        // only show message for first error encountered
        if (!errors) {
          if (t.errorContainer) {
            t.errorContainer.classList.add("active");
            t.errorContainer.innerHTML = input.getAttribute("data-error-msg");
          }
        }
        errors++;
      }
    });

    // validate file inputs are within filesize limits specified with the "data-max-size" attribute
    this.form.querySelectorAll("input[type='file']").forEach((input) => {
      if (input.files.length && input.getAttribute("data-max-size")) {
        var fileSize = input.files[0].size / 1024 / 1024;
        if (fileSize > input.getAttribute("data-max-size")) {
          if (this.errorContainer) {
            this.errorContainer.classList.add("active");
            this.errorContainer.innerHTML = input.getAttribute(
              "data-error-msg"
            );
          }
          errors++;
        }
      }
    });

    // recaptcha
    if (this.recaptchaUrl) {
      var formData = new FormData(this.form);
      fetch(this.recaptchaUrl, {
        method: "post",
        body: formData,
      })
        .then((response) => response.text())
        .then((body) => {
          // fire complete event if declared
          console.log("FormManager: response - " + body);
        })
        .catch((error) => {
          // fire error event if declared
          console.warn("FormManager: " + error);
        });
    }

    if (errors == 0 && this.errorContainer) {
      this.errorContainer.classList.remove("active");
      return true;
    }
    return false;
  }

  /*
  Submit Form
  */
  submitForm() {
    // fire submit event if declared
    if (this.onSubmit) {
      this.onSubmit();
    }
    // create formData
    var formData = new FormData(this.form);
    var object = {};

    //check file inputs for compressed images - send these blobs rather than source files
    this.form.querySelectorAll("input[type='file']").forEach((input) => {
      if (input.accept.indexOf("image") != -1 && input.compressedFile) {
        // clear input value and remove file from formData
        input.value = "";
        formData.delete(input.name);

        // add compressed image to formData
        formData.append(input.name, input.compressedFile);
      }
    });

    fetch(this.form.action, {
      method: "post",
      body: formData,
    })
      .then((response) => response.text())
      .then((body) => {
        // fire complete event if declared
        if (this.onComplete) {
          this.onComplete(body);
        }
      })
      .catch((error) => {
        // fire error event if declared
        if (this.onError) {
          this.onError(error);
        }
      });
  }

  /*
  Form Reset
  */
  reset() {
    this.form.querySelectorAll("input,select,textarea").forEach((input) => {
      // types of input to reset
      var types = ["text", "textarea", "checkbox", "email", "select-one"];
      if (types.includes(input.type)) {
        if (input.type == "checkbox") {
          input.checked = false;
        } else {
          input.value = "";
        }
      }
    });
    // hide warnings
    this.errorContainer.classList.remove("active");
  }

  onSubmit(fn) {
    this.onSubmit = fn;
  }

  onComplete(fn) {
    this.onComplete = fn;
  }

  onError(fn) {
    this.onError = fn;
  }
}

export default FormManager;
