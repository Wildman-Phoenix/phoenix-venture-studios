import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, TrendingUp, Zap, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { useFormSecurity } from "@/hooks/useFormSecurity";
import FormSecurityFields from "@/components/FormSecurityFields";

const BULLETS = [
  { icon: TrendingUp, text: "What founders are reacting to" },
  { icon: Zap, text: "AI and capital shifts worth watching" },
  { icon: BarChart3, text: "Plain-English strategic takeaways" },
];

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  const {
    honeypot, setHoneypot, turnstileRef, validateSubmission, isValidating, hasTurnstile
  } = useFormSecurity("newsletter");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    if (!isSupabaseConfigured) {
      toast({
        title: "Signup temporarily unavailable",
        description: "Please try again later.",
      });
      return;
    }

    setLoading(true);
    try {
      const validation = await validateSubmission(trimmed);
      if (!validation.valid) {
        setLoading(false);
        return;
      }

      const { data: result, error } = await supabase.functions.invoke("submit-form", {
        body: {
          formType: "newsletter_subscribe",
          data: {
            email: trimmed,
            security_form_name: "newsletter",
          },
        },
      });

      if (error) throw error;

      if (result?.already_subscribed) {
        toast({ title: "Already subscribed", description: "This email is already on our list." });
        setSubscribed(true);
      } else if (result?.success) {
        setSubscribed(true);
        toast({ title: "Subscribed!", description: "Welcome to Founder Signal." });
        // Fire welcome email (non-blocking)
        supabase.functions.invoke("newsletter-welcome", { body: { email: trimmed } }).catch(() => {});
      } else {
        throw new Error(result?.error || "Subscription failed");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="newsletter" className="py-24 md:py-32 bg-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(243,108,33,0.2),transparent_26rem),radial-gradient(circle_at_82%_32%,rgba(142,217,210,0.15),transparent_28rem),linear-gradient(180deg,hsl(var(--foreground))_0%,hsl(var(--foreground))_68%,hsl(var(--charcoal-light)/0.3)_100%)]" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/15 text-primary text-sm font-medium mb-7">
              <Mail className="mr-2 h-4 w-4" />
              Founder Signal
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-background mb-5">
              Join the weekly founder briefing
            </h2>
            <p className="text-background/60 mb-3 leading-relaxed text-lg">
              A concise weekly read for founders and business owners who want the signal, the implication, and the next move without sorting through noise first.
            </p>
            <p className="text-background/40 text-sm mb-8">
              No spam. No padded commentary. Just the signals that matter.
            </p>

            {!isSupabaseConfigured && (
              <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-left text-sm text-background/70">
                <p className="font-medium text-background">Signup temporarily unavailable</p>
                <p className="mt-1">
                  Please try again later.
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
              {BULLETS.map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 text-background/50 text-sm">
                  <b.icon className="h-4 w-4 text-primary" />
                  <span>{b.text}</span>
                </div>
              ))}
            </div>

            {subscribed ? (
              <div className="py-8">
                <p className="text-primary font-medium text-lg">You're on the Founder Signal list.</p>
                <p className="text-background/50 text-sm mt-2">Watch your inbox for the next Founder Signal briefing.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-md mx-auto relative">
                <FormSecurityFields honeypot={honeypot} setHoneypot={setHoneypot} turnstileRef={turnstileRef} hasTurnstile={hasTurnstile} />

                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-background/10 border-background/20 text-background placeholder:text-background/40 focus-visible:ring-primary h-12"
                  />
                  <Button type="submit" disabled={loading || isValidating} className="btn-primary whitespace-nowrap h-12 px-6">
                    {loading || isValidating ? "Subscribing..." : "Subscribe to Founder Signal"}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-background/30">
                  By subscribing, you agree to receive Founder Signal. Unsubscribe anytime.
                </p>
              </form>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default NewsletterSignup;
