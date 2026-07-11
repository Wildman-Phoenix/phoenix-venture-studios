import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * useFormSecurity — shared hook for all public-facing forms.
 *
 * Provides:
 * - honeypot: hidden field state + setter
 * - turnstileToken: current Turnstile token (null until solved)
 * - turnstileWidgetId: ref container ID for the Turnstile widget
 * - validateSubmission: async function that calls validate-form edge function
 * - isValidating: loading state during validation
 *
 * Usage:
 *   const { honeypot, setHoneypot, turnstileRef, validateSubmission, isValidating } = useFormSecurity("capital_readiness");
 *
 *   // In form JSX:
 *   <HoneypotField value={honeypot} onChange={setHoneypot} />
 *   <div ref={turnstileRef} />
 *
 *   // Before submission:
 *   const result = await validateSubmission(email);
 *   if (!result.valid) return; // toast already shown
 */

// Turnstile site key — publishable, safe for frontend
// Will be empty string if not configured, which disables Turnstile on frontend
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

interface ValidationResult {
  valid: boolean;
  reason?: string;
  disposableEmail?: boolean;
}

function getValidationToast(reason?: string) {
  switch (reason) {
    case "rate_limited":
      return {
        title: "Too many attempts",
        description: "Too many verification attempts were made. Wait a bit, then try again.",
      };
    case "captcha_failed":
    case "captcha_required":
      return {
        title: "Verification failed",
        description: "Please complete the verification check and try again.",
      };
    case "captcha_unavailable":
      return {
        title: "Verification offline",
        description: "The signup verification service is unavailable right now. Try again shortly.",
      };
    case "validation_required":
      return {
        title: "Verification expired",
        description: "Please complete the verification again before submitting the form.",
      };
    case "validation_lookup_failed":
    case "validation_unavailable":
    case "server_error":
      return {
        title: "Verification unavailable",
        description: "We could not verify the signup form right now. Refresh the page and try again.",
      };
    default:
      return {
        title: "Verification failed",
        description: "Verification did not pass. Please retry the check and submit again.",
      };
  }
}

export function useFormSecurity(formName: string) {
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Load and render Turnstile widget
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current) return;

    const renderWidget = () => {
      if (!turnstileRef.current || widgetIdRef.current) return;

      try {
        widgetIdRef.current = (window as any).turnstile?.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => setTurnstileToken(token),
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => setTurnstileToken(null),
          theme: "light",
          size: "normal",
        });
      } catch (e) {
        console.warn("Turnstile render error:", e);
      }
    };

    // Check if Turnstile script is already loaded
    if ((window as any).turnstile) {
      renderWidget();
      return;
    }

    // Load Turnstile script
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () => {
        // Small delay to ensure turnstile global is available
        setTimeout(renderWidget, 100);
      };
      document.head.appendChild(script);
    } else {
      // Script exists but may still be loading
      const checkReady = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(checkReady);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(checkReady);
    }
  }, []);

  const resetTurnstile = useCallback(() => {
    if (widgetIdRef.current && (window as any).turnstile) {
      try {
        (window as any).turnstile.reset(widgetIdRef.current);
        setTurnstileToken(null);
      } catch (e) {
        console.warn("Turnstile reset error:", e);
      }
    }
  }, []);

  /**
   * validateSubmission — call before saving to Supabase.
   *
   * Sends honeypot value, turnstile token, email, and form name
   * to the validate-form edge function for server-side checks.
   *
   * Shows appropriate toast messages on failure.
   * Returns { valid, disposableEmail } on success.
   */
  const validateSubmission = useCallback(
    async (email = ""): Promise<ValidationResult> => {
      setIsValidating(true);

      try {
        const { data, error } = await supabase.functions.invoke("validate-form", {
          body: {
            formName,
            email,
            honeypot,
            turnstileToken,
          },
        });

        if (error) {
          console.error("Validation edge function error:", error);
          const message = getValidationToast("validation_unavailable");
          toast({
            title: message.title,
            description: message.description,
            variant: "destructive",
          });
          return { valid: false, reason: "validation_unavailable" };
        }

        if (!data.valid) {
          const reason = data.reason;
          const message = getValidationToast(reason);
          toast({
            title: message.title,
            description: message.description,
            variant: "destructive",
          });

          resetTurnstile();
          return { valid: false, reason };
        }

        return {
          valid: true,
          disposableEmail: data.disposableEmail || false,
        };
      } catch (err) {
        console.error("Validation error:", err);
        const message = getValidationToast("validation_unavailable");
        toast({
          title: message.title,
          description: message.description,
          variant: "destructive",
        });
        return { valid: false, reason: "validation_unavailable" };
      } finally {
        setIsValidating(false);
      }
    },
    [formName, honeypot, turnstileToken, toast, resetTurnstile]
  );

  return {
    honeypot,
    setHoneypot,
    turnstileRef,
    turnstileToken,
    validateSubmission,
    isValidating,
    resetTurnstile,
    hasTurnstile: !!TURNSTILE_SITE_KEY,
  };
}
