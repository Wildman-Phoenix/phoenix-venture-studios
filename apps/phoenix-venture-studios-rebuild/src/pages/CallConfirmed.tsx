import { useState } from "react";
import { CheckCircle2, Calendar, Mail, ArrowRight, BookOpen, MessageCircle, Lightbulb, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ScrollReveal from "@/components/ScrollReveal";
import NewsletterSignup from "@/components/NewsletterSignup";
import { useMarketIntelligence } from "@/lib/market-intelligence-feed";
import FormSecurityFields from "@/components/FormSecurityFields";
import { useFormSecurity } from "@/hooks/useFormSecurity";

const _CALENDLY_URL = "https://calendly.com/rpbswildman/new-meeting";

const PRIORITY_OPTIONS = ["Funding now", "Strategy first", "Both", "Still exploring"];
const STAGE_OPTIONS = ["Early traction", "Stable and growing", "Scaling"];
const CONVERSATION_OPTIONS = ["Capital options", "Growth strategy", "Funding readiness", "Partner introductions"];

const CallConfirmed = () => {
  const { toast } = useToast();
  const { articles } = useMarketIntelligence(3);
  const [priority, setPriority] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [conversationType, setConversationType] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    honeypot,
    setHoneypot,
    turnstileRef,
    validateSubmission,
    isValidating,
    hasTurnstile,
  } = useFormSecurity("post_booking");

  const handleSubmitPrep = async () => {
    if (!priority && !stage && !conversationType) return;

    try {
      const validation = await validateSubmission();
      if (!validation.valid) return;

      await supabase.functions.invoke("submit-form", {
        body: {
          formType: "post_booking",
          data: {
            priority,
            business_stage: stage,
            conversation_type: conversationType,
            security_form_name: "post_booking",
          },
        },
      });

      setSubmitted(true);
      toast({
        title: "Thanks!",
        description: "This will help us make the most of our time together.",
      });
    } catch (err) {
      console.error("Error saving prep:", err);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">

          {/* Confirmation Header */}
          <ScrollReveal>
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
                Your Strategy Call Is Confirmed
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
                You're booked in. Our team is reviewing your details, and this is a great place to get oriented before we talk.
              </p>
            </div>
          </ScrollReveal>

          {/* Confirmation Card */}
          <ScrollReveal>
            <div className="card-elevated p-8 rounded-2xl mb-10">
              <div className="flex items-start gap-4 mb-4">
                <Calendar className="h-6 w-6 text-primary mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-heading font-semibold text-foreground text-lg">You're on the calendar</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Check your email for your Zoom link and calendar invite. If you need to reschedule, you can do that from the calendar invite as well.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-sm">
                    Someone from Phoenix Venture Studios may follow up by email beforehand if we have any initial thoughts based on your submission.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Before Your Call */}
          <ScrollReveal>
            <div className="card-elevated p-8 rounded-2xl mb-10">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Before Your Call</h2>
              <p className="text-muted-foreground text-sm mb-6">
                You don't need to prepare anything formal — but reflecting on these three questions can help us make the most of our time together.
              </p>
              <div className="space-y-5">
                {[
                  { icon: Lightbulb, question: "What would this capital help you do right now?" },
                  { icon: Calendar, question: "What timeline are you realistically working with?" },
                  { icon: HelpCircle, question: "Are you looking for capital now, strategy first, or both?" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-foreground text-sm font-medium leading-relaxed">{item.question}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Help Us Prepare */}
          <ScrollReveal>
            <div className="card-elevated p-8 rounded-2xl mb-10">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">Help Us Prepare</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Totally optional — but this helps us tailor the conversation to you.
              </p>

              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <p className="text-foreground font-medium">Got it — we'll use this to prepare.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Priority */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">What best describes your priority right now?</p>
                    <div className="flex flex-wrap gap-2">
                      {PRIORITY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setPriority(priority === opt ? null : opt)}
                          className={`px-4 py-2 rounded-full text-sm border transition-all ${
                            priority === opt
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stage */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">What best describes your current business stage?</p>
                    <div className="flex flex-wrap gap-2">
                      {STAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setStage(stage === opt ? null : opt)}
                          className={`px-4 py-2 rounded-full text-sm border transition-all ${
                            stage === opt
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conversation */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">What kind of conversation would be most valuable?</p>
                    <div className="flex flex-wrap gap-2">
                      {CONVERSATION_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setConversationType(conversationType === opt ? null : opt)}
                          className={`px-4 py-2 rounded-full text-sm border transition-all ${
                            conversationType === opt
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <FormSecurityFields
                    honeypot={honeypot}
                    setHoneypot={setHoneypot}
                    turnstileRef={turnstileRef}
                    hasTurnstile={hasTurnstile}
                  />
                  <Button
                    onClick={handleSubmitPrep}
                    disabled={(!priority && !stage && !conversationType) || isValidating}
                    className="btn-primary w-full py-4"
                  >
                    {isValidating ? "Verifying..." : "Submit"}
                  </Button>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* While You're Here */}
          <ScrollReveal>
            <div className="mb-10">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">While You're Here</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Founders and operators often review these signals before our call.
              </p>

              {articles.length > 0 && (
                <div className="space-y-4 mb-6">
                  {articles.slice(0, 3).map((article, i) => (
                    <div key={i} className="card-elevated p-5 rounded-xl">
                      <p className="text-xs text-muted-foreground mb-1">{article.source}</p>
                      <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{article.headline}</h3>
                      <p className="text-muted-foreground text-xs line-clamp-2">{article.summary}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/market-intelligence" className="flex-1">
                  <Button variant="outline" className="btn-outline-gold w-full">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Market Intelligence
                  </Button>
                </Link>
                <Link to="/market-intelligence" className="flex-1">
                  <Button variant="outline" className="btn-outline-gold w-full">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Signal Archive
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Questions Before We Talk? */}
          <ScrollReveal>
            <div className="card-elevated p-8 rounded-2xl mb-10">
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                <MessageCircle className="inline h-5 w-5 mr-2 text-primary" />
                Questions Before We Talk?
              </h2>
              <p className="text-muted-foreground text-sm mb-5">
                Here are a few things other founders often ask before their strategy call:
              </p>
              <ul className="space-y-3 text-sm text-foreground">
                {[
                  "What kind of capital might fit my business?",
                  "What should I prepare before pursuing funding?",
                  "How do I know if I'm ready for a strategy session?",
                ].map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground/60 mt-5">
                If you have something specific in mind, feel free to reply to your confirmation email and we'll address it during the call.
              </p>
              {/* TODO: Future chatbot widget integration point */}
            </div>
          </ScrollReveal>

          {/* Newsletter Signup */}
          <ScrollReveal>
            <NewsletterSignup />
          </ScrollReveal>

        </div>
      </div>
    </div>
  );
};

export default CallConfirmed;
