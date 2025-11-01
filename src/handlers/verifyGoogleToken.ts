import { OAuth2Client } from "google-auth-library";

interface VerifyTokenEvent {
  googleAuthJWT: string;
  googleClientId: string;
  expectedGoogleId: string;
}

interface VerifyTokenResponse {
  verified: boolean;
  error?: string;
  payload?: {
    sub: string;
    email?: string;
    name?: string;
  };
}

export const handler = async (
  event: VerifyTokenEvent
): Promise<VerifyTokenResponse> => {
  const { googleAuthJWT, googleClientId, expectedGoogleId } = event;

  try {
    const authClient = new OAuth2Client();
    const ticket = await authClient.verifyIdToken({
      idToken: googleAuthJWT,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return {
        verified: false,
        error: "No payload in token",
      };
    }

    // Verify the subject (user ID) matches expected
    if (payload.sub !== expectedGoogleId) {
      return {
        verified: false,
        error: "Google ID mismatch",
      };
    }

    return {
      verified: true,
      payload: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      },
    };
  } catch (error) {
    console.error("Error verifying Google token:", error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};