import { Input } from "@/components/ui/input";
import { RefObject } from "react";

/**
 * FormSecurityFields — renders honeypot + Turnstile widget for any form.
 *
 * Where honeypot is validated: validate-form edge function (step 1)
 * Where Turnstile is verified: validate-form edge function (step 2)
 *
 * The honeypot field is invisible to humans but filled by bots.
 * Turnstile renders a Cloudflare challenge widget.
 */
interface FormSecurityFieldsProps {
  honeypot: string;
  setHoneypot: (value: string) => void;
  turnstileRef: RefObject<HTMLDivElement>;
  hasTurnstile: boolean;
}

const FormSecurityFields = ({
  honeypot,
  setHoneypot,
  turnstileRef,
  hasTurnstile,
}: FormSecurityFieldsProps) => {
  return (
    <>
      {/* Honeypot field — hidden from users, detected by bots */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          opacity: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        <Input
          id="company_fax"
          name="company_fax"
          type="text"
          aria-label="Company fax"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="nope"
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      {/* Cloudflare Turnstile widget container */}
      {hasTurnstile && (
        <div className="flex justify-center my-4">
          <div ref={turnstileRef} />
        </div>
      )}
    </>
  );
};

export default FormSecurityFields;
