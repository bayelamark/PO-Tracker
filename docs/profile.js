const profileName =
  document.querySelector("#profileName");

const profileEmail =
  document.querySelector("#profileEmail");

const logoutButton =
  document.querySelector("#logoutButton");

if (requireLogin()) {
  const user = getLoggedInUser();

  if (!user) {
    logout();
  } else {
    profileName.textContent = user.name;
    profileEmail.textContent = user.email;
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", function () {
    logout();
  });
}