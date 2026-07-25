const AUTH_API_URL =
  "https://po-tracker-d17j.onrender.com/api/auth";

const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const loginMessage = document.querySelector("#loginMessage");
const registerMessage =
  document.querySelector("#registerMessage");



loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = document
    .querySelector("#loginEmail")
    .value
    .trim();

  const password = document
    .querySelector("#loginPassword")
    .value;

  const submitButton =
    loginForm.querySelector("button[type='submit']");

  submitButton.disabled = true;
  submitButton.textContent = "Logging In...";
  loginMessage.textContent = "";

  try {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to log in."
      );
    }

    saveLogin(result.token, result.user);

    window.location.href = "index.html";
  } catch (error) {
    console.error(error);
    loginMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Log In";
  }
});

registerForm.addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    const name = document
      .querySelector("#registerName")
      .value
      .trim();

    const email = document
      .querySelector("#registerEmail")
      .value
      .trim();

    const password = document
      .querySelector("#registerPassword")
      .value;

    const submitButton =
      registerForm.querySelector("button[type='submit']");

    submitButton.disabled = true;
    submitButton.textContent = "Creating Account...";
    registerMessage.textContent = "";

    try {
      const response = await fetch(
        `${AUTH_API_URL}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            email,
            password
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to create account."
        );
      }

      saveLogin(result.token, result.user);

      window.location.href = "index.html";
    } catch (error) {
      console.error(error);
      registerMessage.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Create Account";
    }
  }
);