# include-form-manager

Form element can either have a standard <input type="submit">, or any other element set to type="submit", example:

<a type="submit">Submit</a>

Required elements - set error message with the data-error-msg attribute.

import FormManager from "include-form-manager";

    // setup form
    var Form = new FormManager("#form", {
      errorContainer: "#errors",
      submit: true,
    });

    Form.onSubmit(function (e) {
      console.log("submitted!");
    });
    Form.onComplete(function (e) {
      console.log("done!" + e);
    });
