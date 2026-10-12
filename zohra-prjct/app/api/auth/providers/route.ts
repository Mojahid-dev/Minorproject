import { isGoogleOAuthConfigured } from "@/lib/auth-provider-config";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    {
      googleOAuthConfigured: isGoogleOAuthConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
