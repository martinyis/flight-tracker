declare module "apple-signin-auth" {
  interface VerifyIdTokenOptions {
    audience?: string;
    ignoreExpiration?: boolean;
    nonce?: string;
  }

  interface AppleIdTokenPayload {
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    sub: string;
    email?: string;
    email_verified?: string | boolean;
    is_private_email?: string | boolean;
    nonce?: string;
    nonce_supported?: boolean;
  }

  function verifyIdToken(
    idToken: string,
    options?: VerifyIdTokenOptions
  ): Promise<AppleIdTokenPayload>;

  const _default: { verifyIdToken: typeof verifyIdToken };
  export default _default;
  export { verifyIdToken };
}
