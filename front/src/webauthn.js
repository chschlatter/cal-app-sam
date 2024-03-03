import { startAuthentication } from "@simplewebauthn/browser";

fetch("/api/webauthn/authenticate")
  .then((response) => response.json())
  .then((options) => {
    startAuthentication(options, true)
      .then((response) => {
        fetch("/api/webauthn/authenticate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.verified) {
              window.location.href = "/";
            }
          });
      })
      .catch((error) => console.log(error));
  });
