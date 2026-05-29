import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const updatedDate = "May 23, 2026";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <section className="gradient-subtle py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Privacy Policy
            </div>
            <h1 className="mt-6 font-heading text-3xl font-bold text-foreground md:text-5xl">
              Privacy-first handling for founder inquiries and newsletter signup.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Phoenix Venture Studios collects only the information needed to respond to inquiries,
              route founder support, and deliver requested newsletter communication.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">Last updated: {updatedDate}</p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-border bg-card p-8 shadow-sm md:p-10">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">What we collect</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                We may collect your name, email address, business details, funding context, and
                other information you choose to submit through contact forms, funding questionnaires,
                Venture Snapshot, Founder Signal signup, or unsubscribe requests.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">How we use it</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                We use submitted information to respond to inquiries, evaluate founder support
                requests, send requested newsletter communication, improve the Phoenix experience,
                and operate internal follow-up workflows. We do not promise funding outcomes or sell
                your information as a lead list.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">Security and vendors</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Public forms may use Supabase for secure submission handling, Cloudflare Turnstile for
                abuse prevention, and Resend for requested email delivery. Information is shared with
                service providers only as needed to operate these workflows.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">Your choices</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                You can unsubscribe from Founder Signal marketing email at any time. You can also
                contact Phoenix Venture Studios to request updates or deletion of information you have
                submitted, subject to legal or operational retention needs.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-foreground">Contact</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                For privacy questions, use the Phoenix contact page and include the phrase
                <span className="font-medium text-foreground"> privacy request</span> in your message so
                it can be routed appropriately.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Link to="/contact">
                <Button className="btn-primary">Contact Phoenix</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="btn-outline-gold">Return Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
