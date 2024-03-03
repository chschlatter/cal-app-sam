import Alpine from "alpinejs";
import calLogin from "./calLogin.js";

Alpine.data("calLogin", calLogin);
Alpine.store("username", {
  value: "",
  invalid: false,
  errorMessage: "",
});

window.Alpine = Alpine;
window.App = { apiUrl: "/api" };

// see if DOM is already available
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  // call on next available tick
  setTimeout(init, 1);
} else {
  document.addEventListener("DOMContentLoaded", init);
}

function init() {
  Alpine.start();
}

async function gsiCallback(credResponse) {
  console.log("Google Auth Response: " + credResponse.credential);
  console.log("Username: " + Alpine.store("username").value);

  try {
    const credentials = {
      name: Alpine.store("username").value,
      stayLoggedIn: false,
      googleAuthJWT: credResponse.credential,
    };

    const response = await fetch(`${window.App.apiUrl}/login`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    const data = await response.json();

    if (response.ok) {
      window.location.href = "./";
    } else {
      console.error("Login failed: " + data.message);
    }
  } catch (error) {
    console.error("Login failed: " + error.message);
  }
}

window.gsiCallback = gsiCallback;
