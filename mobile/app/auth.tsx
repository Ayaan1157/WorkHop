import { Redirect } from "expo-router";

// Deep-link landing route for mobile auth redirects (exp://.../auth).
// Session processing happens in AuthProvider; just bounce to the landing page.
export default function AuthRedirect() {
  return <Redirect href="/" />;
}
