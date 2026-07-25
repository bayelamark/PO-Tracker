const PROFILE_API_URL =
  "https://po-tracker-d17j.onrender.com/api/auth/profile";

const profileName =
  document.querySelector("#profileName");

const profileEmail =
  document.querySelector("#profileEmail");

const profileNameInput =
  document.querySelector("#profileNameInput");

const profileMessage =
  document.querySelector("#profileMessage");

const nameForm =
  document.querySelector("#nameForm");

const logoutButton =
  document.querySelector("#logoutButton");

if (requireLogin()) {
  const user = getLoggedInUser();

  if (!user) {
    logout();
  } else {
    profileName.textContent = user.name;
    profileEmail.textContent = user.email;
    profileNameInput.value = user.name;
  }
}

nameForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const name = profileNameInput.value.trim();

  const submitButton =
    nameForm.querySelector("button[type='submit']");

  submitButton.disabled = true;
  submitButton.textContent = "Saving...";
  profileMessage.textContent = "";

  try {
    const response = await fetch(PROFILE_API_URL, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: name
      })
    });

    const result = await response.json();

    if (response.status === 401) {
      logout();
      return;
    }

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to update the name."
      );
    }

    saveLogin(getAuthToken(), result.user);

    profileName.textContent = result.user.name;
    profileNameInput.value = result.user.name;
    profileMessage.textContent = "Name updated successfully.";
  } catch (error) {
    console.error(error);
    profileMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Save Name";
  }
});

if (logoutButton) {
  logoutButton.addEventListener("click", function () {
    logout();
  });
}