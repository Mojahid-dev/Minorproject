import { isEmailDeliveryConfigured } from "@/lib/email";
import { isGoogleOAuthConfigured } from "@/lib/auth-provider-config";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      emailVerificationConfigured: isEmailDeliveryConfigured(),
      googleOAuthConfigured: isGoogleOAuthConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
