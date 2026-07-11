import { supabase } from "@/integrations/supabase/client";

export interface WelcomeDeliveryResult {
  delivered: boolean;
  reason: string;
  error?: string;
}

export async function sendWelcomeEmail(email: string): Promise<WelcomeDeliveryResult> {
  try {
    const { data, error } = await supabase.functions.invoke("newsletter-welcome", {
      body: { email },
    });

    if (error) {
      return {
        delivered: false,
        reason: "invoke_error",
        error: error.message || "Welcome email could not be queued.",
      };
    }

    if (!data?.success) {
      return {
        delivered: false,
        reason: data?.delivery || data?.method || "delivery_failed",
        error: data?.error || "Welcome email could not be delivered.",
      };
    }

    return {
      delivered: true,
      reason: data?.delivery || data?.method || "email",
    };
  } catch (error) {
    return {
      delivered: false,
      reason: "unexpected_error",
      error: error instanceof Error ? error.message : "Welcome email could not be delivered.",
    };
  }
}
