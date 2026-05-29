import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MailX, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
import FormSecurityFields from "@/components/FormSecurityFields";
import { useFormSecurity } from "@/hooks/useFormSecurity";

const Unsubscribe = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const {
    honeypot,
    setHoneypot,
    turnstileRef,
    validateSubmission,
    isValidating,
    hasTurnstile,
  } = useFormSecurity("unsubscribe");

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);

    try {
      const validation = await validateSubmission(trimmed);
      if (!validation.valid) return;

      const { data: result, error } = await supabase.functions.invoke("submit-form", {
        body: {
          formType: "newsletter_unsubscribe",
          data: {
            email: trimmed,
            security_form_name: "unsubscribe",
          },
        },
      });

      if (error || result?.error) throw new Error(result?.error || "Unsubscribe failed");

      setDone(true);
      toast({ title: "Unsubscribed", description: "You've been removed from our mailing list." });
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen pt-24 pb-16 gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-4">
              You've Been Unsubscribed
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              We've removed you from Founder Signal. You won't receive any more marketing emails from us.
              If you ever want to rejoin, you're always welcome.
            </p>
            <Link to="/">
              <Button className="btn-primary">
                Return to Homepage <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <MailX className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">
            Unsubscribe
          </h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            We're sorry to see you go. Enter your email below to unsubscribe from Founder Signal and marketing communications.
          </p>
          <form onSubmit={handleUnsubscribe} className="space-y-4 max-w-sm mx-auto">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormSecurityFields
              honeypot={honeypot}
              setHoneypot={setHoneypot}
              turnstileRef={turnstileRef}
              hasTurnstile={hasTurnstile}
            />
            <Button type="submit" variant="outline" className="w-full" disabled={loading || isValidating}>
              {loading || isValidating ? "Processing..." : "Unsubscribe"}
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground">
            You will still receive any transactional or operational emails related to active submissions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Unsubscribe;
